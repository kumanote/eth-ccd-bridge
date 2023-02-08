pub mod contracts;
pub mod deployer;

use std::{
    fs::File,
    io::{BufReader, BufWriter, Cursor, Write},
};

use anyhow::Context;
use big_s::S;
use concordium_contracts_common::{Address, NewContractNameError, NewReceiveNameError};
use concordium_rust_sdk::{
    endpoints::{self, RPCError},
    types::{
        smart_contracts::{ExceedsParameterSize, ModuleRef, WasmModule},
        ContractAddress,
    },
};
use deployer::{Deployer, ModuleDeployed};
use hex::FromHexError;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::{
    contracts::{convert_contract_address, BridgeRoles, CIS2BridgeableRoles},
    deployer::{BRIDGE_UPGRADE_METHOD, CIS2_UPGRADE_METHOD},
};

#[derive(Deserialize, Debug, Clone)]
pub struct Config {
    pub concordium_url: String,
    pub concordium_token: String,

    pub concordium_manager_account_file: String,
}

#[derive(Clone, Debug)]
pub struct WrappedToken {
    pub name: String,
    pub token_metadata_url: String,
    pub token_metadata_hash: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Output {
    pub bridge_manager: ContractAddress,
    pub tokens: Vec<OutputToken>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OutputToken {
    pub name: String,
    pub token_url: String,
    pub contract: ContractAddress,
}

#[derive(Error, Debug)]
pub enum DeployError {
    #[error("concordium error: {0}")]
    RPCError(#[from] RPCError),
    #[error("transport error: {0}")]
    TransportError(#[from] tonic::transport::Error),
    #[error("config error: {0}")]
    ConfigError(#[from] envy::Error),
    #[error("query error: {0}")]
    QueryError(#[from] endpoints::QueryError),
    #[error("anyhow error: {0}")]
    AnyhowError(#[from] anyhow::Error),
    #[error("There are unfinalized transactions. Transaction nonce is not reliable enough.")]
    NonceNotFinal,
    #[error("Transaction rejected: {0}")]
    TransactionRejected(RPCError),
    #[error("Transaction rejected: {0:?}")]
    TransactionRejectedR(String),
    #[error("Invalid block item: {0}")]
    InvalidBlockItem(String),
    #[error("Invalid contract name: {0}")]
    InvalidContractName(String),
    #[error("hex decoding error: {0}")]
    HexDecodingError(#[from] FromHexError),
    #[error("failed to parse receive name: {0}")]
    FailedToParseReceiveName(String),
    #[error("Json error: {0}")]
    JSONError(#[from] serde_json::Error),
    #[error("Parameter size error: {0}")]
    ParameterSizeError(#[from] ExceedsParameterSize),
    #[error("Receive name error: {0}")]
    ReceiveNameError(#[from] NewReceiveNameError),
    #[error("Contract name error: {0}")]
    ContractNameError(#[from] NewContractNameError),
    #[error("Reqwest error: {0}")]
    ReqwestError(#[from] reqwest::Error),
    #[error("Invalid metadata hash: {0}")]
    InvalidHash(String),
    #[error("IO error: {0}")]
    IOError(#[from] std::io::Error),
    #[error("Invoke contract failed: {0}")]
    InvokeContractFailed(String),
}

#[allow(dead_code)]
fn module_deployed(module_ref: &str) -> Result<ModuleDeployed, DeployError> {
    let mut bytes = [0u8; 32];
    hex::decode_to_slice(module_ref, &mut bytes)?;

    let module_deployed = ModuleDeployed {
        module_ref: ModuleRef::from(bytes),
    };

    Ok(module_deployed)
}

fn get_wasm_module(file: &str) -> Result<WasmModule, DeployError> {
    let wasm_module =
        std::fs::read(file).context("Could not read the cis2_bridgeable.wasm.v1 file")?;
    let mut cursor = Cursor::new(wasm_module);
    let wasm_module: WasmModule = concordium_rust_sdk::common::from_bytes(&mut cursor)?;
    Ok(wasm_module)
}

async fn get_and_compare_metadata_hash(url: &str, hash: &str) -> Result<[u8; 32], DeployError> {
    let response = reqwest::get(url).await?;
    let metadata = response.text().await?;

    let mut hasher = Sha256::new();
    hasher.update(metadata);
    let result = hasher.finalize();

    let mut bytes = [0u8; 32];
    hex::decode_to_slice(hash, &mut bytes)?;

    if result.as_slice() != bytes {
        return Err(DeployError::InvalidHash(format!(
            "hashes do not match for url {}, expected: {:?}, got: {:?}",
            url, bytes, result
        )));
    }

    Ok(bytes)
}

async fn deploy_token(
    deployer: &Deployer,
    token: &WrappedToken,
    cis2_bridgeable_module_ref: ModuleRef,
    bridge_manager: ContractAddress,
) -> Result<OutputToken, DeployError> {
    println!("Initializing cis2-bridgeable {}....", token.name);

    let metadata_hash =
        get_and_compare_metadata_hash(&token.token_metadata_url, &token.token_metadata_hash)
            .await?;

    let mock_token = deployer
        .init_token_contract(
            token.name.clone(),
            token.token_metadata_url.clone(),
            metadata_hash,
            cis2_bridgeable_module_ref,
        )
        .await?;
    println!(
        "Initialized cis2-bridgeable {} at address: ({}, {})",
        token.name, mock_token.index, mock_token.subindex
    );
    println!(
        "Granting bridge-manager Manager role on {} token....",
        token.name
    );
    deployer
        .token_grant_role(
            mock_token,
            Address::Contract(convert_contract_address(&bridge_manager)),
            CIS2BridgeableRoles::Manager,
        )
        .await?;
    println!(
        "Granted bridge-manager Manager role on {} token",
        token.name.clone()
    );

    let token = OutputToken {
        name: token.name.clone(),
        token_url: token.token_metadata_url.clone(),
        contract: mock_token,
    };

    Ok(token)
}

async fn init_contracts(
    deployer: &Deployer,
    tokens: &[WrappedToken],
    bridge_manager_module_ref: ModuleRef,
    cis2_bridgeable_module_ref: ModuleRef,
) -> Result<(), DeployError> {
    println!("Initializing bridge-manager....");
    let bridge_manager = deployer
        .init_bridge_contract(bridge_manager_module_ref)
        .await?;
    println!(
        "Initialized bridge-manager, address: ({}, {})",
        bridge_manager.index, bridge_manager.subindex
    );
    println!("Granting Manager address Manager role on bridge-manager....");
    deployer
        .bridge_grant_role(bridge_manager, BridgeRoles::StateSyncer)
        .await?;
    println!("Granted Manager address Manager role on bridge-manager");

    println!("");

    let mut output = Output {
        bridge_manager: bridge_manager,
        tokens: vec![],
    };

    for token in tokens {
        let output_token =
            deploy_token(deployer, token, cis2_bridgeable_module_ref, bridge_manager).await?;
        output.tokens.push(output_token);

        println!("");
    }

    println!("");

    let json = serde_json::to_string_pretty(&output)?;

    println!("{}", json);

    let file = File::create("../latest.json")?;
    let mut writer = BufWriter::new(file);
    writer.write_all(json.as_bytes())?;

    Ok(())
}

async fn upgrade_contracts(
    deployer: &Deployer,
    tokens: &[WrappedToken],
    bridge_manager_module_ref: ModuleRef,
    cis2_bridgeable_module_ref: ModuleRef,
) -> Result<(), DeployError> {
    let file = File::open("../latest.json")?;
    let reader = BufReader::new(file);
    let mut output: Output = serde_json::from_reader(reader)?;

    println!("Upgrading bridge-manager....");
    deployer
        .upgrade_contract(
            bridge_manager_module_ref,
            output.bridge_manager,
            BRIDGE_UPGRADE_METHOD,
        )
        .await?;

    println!("Upgraded bridge-manager");

    println!("");

    println!("Upgrading cis2-bridgeable contracts....");

    for token in tokens {
        println!("Upgrading cis2-bridgeable {}....", token.name);

        match output.tokens.iter().find(|t| t.name == token.name) {
            Some(token_output) => {
                deployer
                    .upgrade_contract(
                        cis2_bridgeable_module_ref,
                        token_output.contract,
                        CIS2_UPGRADE_METHOD,
                    )
                    .await?;
            }
            None => {
                let output_token = deploy_token(
                    deployer,
                    token,
                    cis2_bridgeable_module_ref,
                    output.bridge_manager,
                )
                .await?;

                output.tokens.push(output_token);
            }
        }
    }

    println!("");

    let json = serde_json::to_string_pretty(&output)?;

    println!("{}", json);

    let file = File::create("../latest.json")?;
    let mut writer = BufWriter::new(file);
    writer.write_all(json.as_bytes())?;

    Ok(())
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), DeployError> {
    let config = envy::from_env::<Config>()?;

    let concordium_client =
        endpoints::Client::connect(config.concordium_url, config.concordium_token).await?;

    let deployer = Deployer::new(concordium_client, config.concordium_manager_account_file)?;

    let mut upgrade = false;

    if std::env::args().len() == 2 {
        let command = std::env::args().nth(1).unwrap();

        if command == S("upgrade") {
            upgrade = true;
        } else {
            println!("Usage: {} [upgrade]", std::env::args().nth(0).unwrap());
            return Ok(());
        }
    }

    let tokens = [
        WrappedToken {
            name: S("ETH.eth"),
            token_metadata_url: S("https://relayer-testnet.toni.systems/token/metadata/ETH.et"),
            token_metadata_hash: S(
                "08951bc955a7cc53d5d374d79be086357837cbacc7387e1803976bb6569ecaea",
            ),
        },
        WrappedToken {
            name: S("MOCK.et"),
            token_metadata_url: S("https://relayer-testnet.toni.systems/token/metadata/MOCK.et"),
            token_metadata_hash: S(
                "9fe0f5ab1019deec299474bcc712afdee4aa59762cd6e6b1fc23223a36e96f6f",
            ),
        },
        WrappedToken {
            name: S("USDC.et"),
            token_metadata_url: S("https://relayer-testnet.toni.systems/token/metadata/USDC.et"),
            token_metadata_hash: S(
                "be08a2ad4f7b9633b2cd2ee101b6555e512fc67556dd8234bfe05cdbccd574a0",
            ),
        },
    ];

    // make sure we didn't mess up the hashes:
    for token in tokens.iter() {
        let _ =
            get_and_compare_metadata_hash(&token.token_metadata_url, &token.token_metadata_hash)
                .await?;
    }

    let wasm_module = get_wasm_module("data/cis2_bridgeable.wasm.v1")?;
    println!("Deploying cis2-bridgeable....");
    let cis2_bridgeable_module_ref = deployer.deploy_wasm_module(wasm_module).await?;
    println!(
        "Deployed cis2-bridgeable, module_ref: {}",
        cis2_bridgeable_module_ref.module_ref.to_string()
    );

    println!("");

    let wasm_module = get_wasm_module("data/bridge_manager.wasm.v1")?;
    println!("Deploying bridge-manager....");
    let bridge_manager_module_ref = deployer.deploy_wasm_module(wasm_module).await?;
    println!(
        "Deployed bridge-manager, module_ref: {}",
        bridge_manager_module_ref.module_ref.to_string()
    );

    println!("");

    if upgrade {
        upgrade_contracts(
            &deployer,
            &tokens,
            bridge_manager_module_ref.module_ref,
            cis2_bridgeable_module_ref.module_ref,
        )
        .await?;
    } else {
        init_contracts(
            &deployer,
            &tokens,
            bridge_manager_module_ref.module_ref,
            cis2_bridgeable_module_ref.module_ref,
        )
        .await?;
    }

    Ok(())
}
