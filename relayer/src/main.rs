use anyhow::Context;
use ccdeth_relayer::{
    concordium_contracts::{self, BridgeManagerClient},
    db::{self, Database},
    ethereum,
    merkle::{self, MerkleSetterClient},
    state_sender::StateSender,
};
use clap::Parser;
use concordium::{
    types::{AbsoluteBlockHeight, ContractAddress, WalletAccount},
    v2,
};
use concordium_rust_sdk as concordium;
use ethabi::ethereum_types::{H160, U256};
use ethers::prelude::{
    Http, HttpRateLimitRetryPolicy, LocalWallet, Middleware, Provider, RetryClient, Signer,
};
use futures::Future;
use std::{path::PathBuf, sync::Arc};

/// Goerli test network chain ID.
/// Needs to be changed for production.
const CHAIN_ID: u64 = 5;

#[derive(Parser, Debug)]
#[clap(author, version, about)]
struct Relayer {
    #[clap(
        long = "log-level",
        default_value = "info",
        help = "Maximum log level.",
        env = "ETHCCD_RELAYER_LOG_LEVEL"
    )]
    log_level: log::LevelFilter,
    #[clap(
        long = "state-sender-address",
        help = "Address of the StateSender proxy instance.",
        env = "ETHCCD_RELAYER_STATE_SENDER_PROXY"
    )]
    state_sender: ethers::core::types::Address,
    #[clap(
        long = "root-chain-manager-address",
        help = "Address of the RootChainManager proxy instance.",
        env = "ETHCCD_RELAYER_ROOT_CHAIN_MANAGER_PROXY"
    )]
    root_chain_manager: ethers::core::types::Address,
    #[clap(
        long = "state-sender-creation-height",
        help = "Block number when the state sender instance was created.",
        env = "ETHCCD_RELAYER_STATE_SENDER_CREATION_BLOCK_NUMBER"
    )]
    state_sender_creation_block_number: u64,
    #[clap(
        long = "start-block",
        help = "Where to start monitoring if no activity is yet detected on the state manager.",
        env = "ETHCCD_RELAYER_ETH_START_BLOCK"
    )]
    start_block: u64,
    #[clap(
        long = "bridge-manager-address",
        help = "Address of the BridgeManger contract on Concordium.",
        env = "ETHCCD_RELAYER_BRIDGE_MANAGER"
    )]
    bridge_manager: ContractAddress,
    #[clap(
        long = "concordium-wallet-file",
        help = "File with the Concordium wallet.",
        env = "ETHCCD_RELAYER_CONCORDIUM_WALLET_FILE"
    )]
    concordium_wallet: PathBuf,
    #[clap(
        long = "concordium-api",
        help = "GRPC V2 interface of the Concordium node.",
        env = "ETHCCD_RELAYER_CONCORDIUM_API",
        default_value = "http://localhost:20000"
    )]
    concordium_api: v2::Endpoint,
    #[clap(
        long = "ethereum-api",
        help = "JSON-RPC interface.",
        env = "ETHCCD_RELAYER_ETHEREUM_API"
    )]
    ethereum_api: url::Url,
    #[clap(
        long = "db",
        default_value = "host=localhost dbname=relayer user=postgres password=password port=5432",
        help = "Database connection string.",
        env = "ETHCCD_RELAYER_DB_STRING"
    )]
    db_config: tokio_postgres::Config,
    #[clap(long, env = "ETH_ADDRESS")]
    eth_address: H160,
    #[clap(long, env = "ETH_KEY")]
    eth_private_key: LocalWallet,
    #[clap(
        long,
        env = "ETHCCD_RELAYER_MAX_PARALLEL_QUERIES_CONCORDIUM",
        default_value = "8"
    )]
    max_parallel: u32,
    // Maximum number of seconds a concordium node can be behind before it is deemed "behind".
    #[clap(
        long,
        env = "ETHCCD_RELAYER_CONCORDIUM_MAX_BEHIND",
        default_value = "240"
    )]
    max_behind: u32,
    // Maximum gas price.
    #[clap(
        long,
        env = "ETHCCD_RELAYER_MAX_GAS_PRICE",
        default_value = "1000000000"
    )]
    max_gas_price: U256,
    // Maximum gas for setting merkle roots.
    #[clap(long, env = "ETHCCD_RELAYER_MAX_GAS_PRICE", default_value = "100000")]
    max_gas: U256,
    // Maximum gas for setting merkle roots.
    #[clap(
        long,
        env = "ETHCCD_RELAYER_MERKLE_UPDATE_INTERVAL",
        default_value = "600"
    )]
    merkle_update_interval: u64,
}

const NUM_CONFIRMATIONS: u64 = 14;

fn spawn_report<E, A, T>(future: T) -> tokio::task::JoinHandle<T::Output>
where
    T: Future<Output = Result<A, E>> + Send + 'static,
    A: Send + 'static,
    E: Send + 'static + std::fmt::Debug, {
    tokio::spawn(async move {
        match future.await {
            Ok(a) => Ok(a),
            Err(e) => {
                log::error!("Task terminated: {:#?}", e);
                Err(e)
            }
        }
    })
}

async fn find_start_ethereum_config<M: Middleware>(
    client: M,
    last_processed: Option<u64>,
    creation_height: u64,
) -> anyhow::Result<(u64, u64)>
where
    M::Error: 'static, {
    let last_finalized: u64 = client
        .get_block_number()
        .await?
        .as_u64()
        .saturating_sub(NUM_CONFIRMATIONS);
    if let Some(last_processed) = last_processed {
        Ok((
            last_processed + 1,
            std::cmp::max(last_processed + 1, last_finalized),
        ))
    } else {
        Ok((
            creation_height,
            std::cmp::max(last_finalized, creation_height),
        ))
    }
}

async fn find_concordium_start_height(
    mut client: v2::Client,
    last_processed: Option<AbsoluteBlockHeight>,
    manager_address: ContractAddress,
) -> anyhow::Result<AbsoluteBlockHeight> {
    if let Some(h) = last_processed {
        Ok(h.next())
    } else {
        let (height, _, _) = client.find_instance_creation(.., manager_address).await?;
        Ok(height)
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let app: Relayer = Relayer::parse();

    let mut log_builder = env_logger::Builder::from_env("ETHCCD_RELAYER_LOG");
    // only log the current module (main).
    log_builder.filter_module(module_path!(), app.log_level);
    log_builder.init();

    let inner_ethereum_client = Http::new(app.ethereum_api);
    let ethereum_client = RetryClient::new(
        inner_ethereum_client,
        Box::new(HttpRateLimitRetryPolicy::default()),
        5,
        3000,
    );

    let provider = Provider::new(ethereum_client);

    let ethereum_client = Arc::new(provider);

    // Transactions will be signed with the private key below and will be broadcast
    // via the eth_sendRawTransaction API)
    let wallet: LocalWallet = app.eth_private_key.with_chain_id(CHAIN_ID);
    let sender = wallet.address();

    let balance = ethereum_client.get_balance(sender, None).await?;
    println!("{:#?}", balance);
    let ethereum_nonce = ethereum_client.get_transaction_count(sender, None).await?;
    println!("Nonce = {}", ethereum_nonce);
    let gas_price = ethereum_client.get_gas_price().await?;
    println!("Gas price = {}", gas_price);

    // ethers::prelude::Abigen::new("BridgeManager", "abis/root-chain-manager.json")
    //     .unwrap()
    //     .generate()
    //     .unwrap()
    //     .write_to_file(format!("src/root_chain_manager.rs"))
    //     .unwrap();

    // ethers::prelude::Abigen::new("StateSender", "abis/state-sender.json")
    //     .unwrap()
    //     .generate()
    //     .unwrap()
    //     .write_to_file(format!("src/state_sender.rs"))
    //     .unwrap();

    // ethers::prelude::Abigen::new("Erc20", "abis/erc20.json")
    //     .unwrap()
    //     .generate()
    //     .unwrap()
    //     .write_to_file(format!("src/erc20.rs"))
    //     .unwrap();

    // return Ok(());

    // let erc20 = ccdeth_relayer::erc20::Erc20::new(app.state_sender,
    // ethereum_client.clone()); let name = erc20.name().call().await;
    // let decimals = erc20.decimals().call().await?;

    let state_sender_contract = StateSender::new(app.state_sender, ethereum_client.clone());

    let root_chain_manager_contract = ccdeth_relayer::root_chain_manager::BridgeManager::new(
        app.root_chain_manager,
        Arc::new(ethereum_client.clone()),
    );

    let concordium_client = v2::Client::new(app.concordium_api).await?;
    let (last_ethereum, last_concordium, db) = Database::new(app.db_config).await?;
    let start_nonce = db.submit_missing_txs(concordium_client.clone()).await?;

    let bridge_manager_client =
        BridgeManagerClient::new(concordium_client.clone(), app.bridge_manager);

    let bridge_manager = {
        let wallet = WalletAccount::from_json_file(app.concordium_wallet)?;
        concordium_contracts::BridgeManager::new(bridge_manager_client.clone(), wallet, start_nonce)
            .await
            .context("Unable to connect to Concordium API.")?
    };

    let (start_number, upper_number) = find_start_ethereum_config(
        ethereum_client.clone(),
        last_ethereum,
        app.state_sender_creation_block_number,
    )
    .await?;
    log::info!(
        "Found starting point at start {}, end {})",
        start_number,
        upper_number,
    );
    let concordium_start_height = find_concordium_start_height(
        concordium_client.clone(),
        last_concordium,
        app.bridge_manager,
    )
    .await?;

    let (max_marked_event_index, leaves) = db
        .pending_withdrawals(bridge_manager_client.clone())
        .await?;

    // To spawn

    let (db_sender, db_receiver) = tokio::sync::mpsc::channel(50);
    let (ccd_transaction_sender, ccd_transaction_receiver) = tokio::sync::mpsc::channel(50);
    let (merkle_setter_sender, merkle_setter_receiver) = tokio::sync::mpsc::channel(50);

    let pending_merkle_set = db.pending_ethereum_tx().await?;

    let tx_sender_handle = tokio::spawn(concordium_contracts::concordium_tx_sender(
        concordium_client.clone(),
        ccd_transaction_receiver,
    ));

    let db_task_handle = spawn_report(db::handle_database(
        db,
        db_receiver,
        bridge_manager,
        ccd_transaction_sender,
        merkle_setter_sender,
    ));

    let mark_concordium_txs_handle = spawn_report(db::mark_concordium_txs(
        db_sender.clone(),
        concordium_client,
    ));

    let stop_flag = std::sync::atomic::AtomicBool::new(false);

    let watch_concordium_handle = spawn_report(concordium_contracts::use_node(
        bridge_manager_client.clone(),
        db_sender.clone(),
        concordium_start_height,
        app.max_parallel,
        stop_flag, // TODO: Stop flag must be shared
        app.max_behind,
    ));

    let watch_ethereum_handle = spawn_report(ethereum::watch_eth_blocks(
        state_sender_contract,
        db_sender.clone(),
        start_number,
        upper_number,
    ));

    let merkle_client = MerkleSetterClient::new(
        root_chain_manager_contract,
        wallet,
        app.max_gas_price,
        app.max_gas,
        ethereum_nonce,
        &pending_merkle_set,
        chrono::Duration::seconds(app.merkle_update_interval.try_into()?),
        leaves,
        max_marked_event_index,
    )?;

    let merkle_updater_handle = spawn_report(merkle::send_merkle_root_updates(
        merkle_client,
        pending_merkle_set,
        merkle_setter_receiver,
        db_sender.clone(),
    ));
    // TODO: Send these merkle updates.

    tokio::select! {
        x = tx_sender_handle => {
            println!("Transaction sender terminated {:#?}", x)
        }
        x = db_task_handle => {
            println!("DB task terminated {:#?}", x)
        }
        x = mark_concordium_txs_handle => {
            println!("Mark concordium transactions terminated {:#?}", x)
        }
        x = watch_concordium_handle => {
            println!("Watch concordium terminated {:#?}", x)
        }
        x = watch_ethereum_handle => {
            println!("Watch ethereum terminated {:#?}", x)
        }
        x = merkle_updater_handle => {
            println!("Merkle updater terminated {:#?}", x)
        }
    };

    Ok(())
}
