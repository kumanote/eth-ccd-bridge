use std::str::FromStr;

use anyhow::Context;
use big_s::S;
use concordium_contracts_common::{Address, ModuleReference, OwnedContractName, OwnedReceiveName};
use concordium_rust_sdk::{
    common::types::{Amount, TransactionTime},
    endpoints::{Client, QueryError},
    id::{self, types::AccountAddress},
    types::{
        queries::AccountNonceResponse,
        smart_contracts::{
            ContractContext, InvokeContractResult, ModuleRef, Parameter, WasmModule,
        },
        transactions::{
            self,
            send::{deploy_module, init_contract, GivenEnergy},
            InitContractPayload, UpdateContractPayload,
        },
        AccountTransactionEffects, BlockItemSummary, BlockItemSummaryDetails, ContractAddress,
        Energy, RejectReason, TransactionType,
    },
};
use serde::{Deserialize, Serialize};

use crate::{
    contracts::{
        convert_account_address, BridgeGrantRoleParams, BridgeRoles, CIS2BridgeableGrantRoleParams,
        CIS2BridgeableInitParams, CIS2BridgeableRoles, UpgradeParams,
    },
    DeployError,
};

const BRIDGE_GRANT_ROLE_METHOD: &str = "bridge-manager.grantRole";
const BRIDGE_INIT_METHOD: &str = "init_bridge-manager";
pub const BRIDGE_UPGRADE_METHOD: &str = "bridge-manager.upgrade";
pub const CIS2_UPGRADE_METHOD: &str = "cis2-bridgeable.upgrade";
const CIS2_GRANT_ROLE_METHOD: &str = "cis2-bridgeable.grantRole";
const CIS2_INIT_METHOD: &str = "init_cis2-bridgeable";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
/// Helper to parse account keys.
pub struct AccountData {
    account_keys: id::types::AccountKeys,
    address: id::types::AccountAddress,
}

#[derive(Clone, Debug)]
pub struct ModuleDeployed {
    pub module_ref: ModuleRef,
}

#[derive(Clone, Debug)]
pub struct ContractInitialized {
    pub contract: ContractAddress,
}

#[derive(Clone, Debug)]
pub struct Deployer {
    pub client: Client,
    pub manager_key: String,
}

impl Deployer {
    pub fn new(client: Client, wallet_account_file: String) -> Result<Deployer, DeployError> {
        let key_data = std::fs::read_to_string(wallet_account_file)
            .context("Could not read the keys file.")?;

        Ok(Deployer {
            client: client,
            manager_key: key_data,
        })
    }

    pub async fn module_exists(&self, wasm_module: WasmModule) -> Result<bool, DeployError> {
        let consensus_info = self.client.clone().get_consensus_status().await?;

        let latest_block = consensus_info.last_finalized_block;

        let module_ref = wasm_module.get_module_ref();

        let module_ref = self
            .client
            .clone()
            .get_module_source(&module_ref, &latest_block)
            .await;

        match module_ref {
            Ok(_) => Ok(true),
            Err(e) => match e {
                QueryError::NotFound => Ok(false),
                _ => Err(e.into()),
            },
        }
    }

    pub async fn deploy_wasm_module(
        &self,
        wasm_module: WasmModule,
    ) -> Result<ModuleDeployed, DeployError> {
        let exists = self.module_exists(wasm_module.clone()).await?;

        if exists {
            println!(
                "Module with reference {} already exists.",
                wasm_module.get_module_ref()
            );
            return Ok(ModuleDeployed {
                module_ref: wasm_module.get_module_ref(),
            });
        }

        let manager_account = self.get_manager_account()?;
        let nonce = self.get_nonce(manager_account.address).await?;

        if !nonce.all_final {
            return Err(DeployError::NonceNotFinal);
        }

        let expiry = TransactionTime::from_seconds((chrono::Utc::now().timestamp() + 300) as u64);

        let tx = deploy_module(
            &manager_account.account_keys,
            manager_account.address,
            nonce.nonce,
            expiry,
            wasm_module,
        );
        let bi = transactions::BlockItem::AccountTransaction(tx);

        let tx_hash = self
            .client
            .clone()
            .send_block_item(&bi)
            .await
            .map_err(|e| DeployError::TransactionRejected(e))?;

        let (_, block_item) = self.client.clone().wait_until_finalized(&tx_hash).await?;

        let module_deployed = self.parse_deploy_module_event(block_item)?;

        println!(
            "Transaction finalized, tx_hash={} module_ref={}",
            tx_hash,
            module_deployed.module_ref.to_string(),
        );

        Ok(module_deployed)
    }

    pub async fn init_token_contract(
        &self,
        _name: String,
        metadata: String,
        metadata_hash: [u8; 32],
        module_ref: ModuleRef,
    ) -> Result<ContractAddress, DeployError> {
        let parameters = CIS2BridgeableInitParams {
            url: metadata,
            hash: Some(metadata_hash),
        };
        let bytes = concordium_contracts_common::to_bytes(&parameters);
        let param: Parameter = bytes.try_into()?;

        let payload = InitContractPayload {
            init_name: OwnedContractName::new(S(CIS2_INIT_METHOD))?,
            amount: Amount::from_micro_ccd(0),
            mod_ref: module_ref,
            param: param,
        };

        let contract = self.init_contract(payload).await?;

        Ok(contract)
    }

    pub async fn init_bridge_contract(
        &self,
        module_ref: ModuleRef,
    ) -> Result<ContractAddress, DeployError> {
        let param: Parameter = Parameter::default();

        let payload = InitContractPayload {
            init_name: OwnedContractName::new(S(BRIDGE_INIT_METHOD))?,
            amount: Amount::from_micro_ccd(0),
            mod_ref: module_ref,
            param: param,
        };

        let contract = self.init_contract(payload).await?;

        Ok(contract)
    }

    pub async fn upgrade_contract(
        &self,
        new_module_ref: ModuleRef,
        contract: ContractAddress,
        method: &str,
    ) -> Result<(), DeployError> {
        let consensus_info = self.client.clone().get_consensus_status().await?;

        let latest_block = consensus_info.last_finalized_block;

        let state = self
            .client
            .clone()
            .get_instance_info(contract, &latest_block)
            .await?;

        let current_module_ref = state.source_module();

        if current_module_ref == new_module_ref {
            println!("Contract already uses the new module.");
            return Ok(());
        }

        let manager_account = self.get_manager_account()?;
        let nonce = self.get_nonce(manager_account.address).await?;

        if !nonce.all_final {
            return Err(DeployError::NonceNotFinal);
        }

        let slice: &[u8] = &new_module_ref.as_ref();
        let slice: [u8; 32] = slice.try_into().unwrap();
        let modref: ModuleReference = ModuleReference::from(slice);

        let params = UpgradeParams {
            module: modref,
            migrate: None,
        };
        let bytes = concordium_contracts_common::to_bytes(&params);

        let update_payload = transactions::UpdateContractPayload {
            amount: Amount::from_ccd(0),
            address: contract,
            receive_name: OwnedReceiveName::from_str(method)?,
            message: bytes.try_into()?,
        };

        let energy = self
            .estimate_energy(update_payload.clone(), manager_account.address)
            .await?;

        self.update_contract(manager_account, update_payload, GivenEnergy::Add(energy))
            .await?;

        Ok(())
    }

    pub async fn init_contract(
        &self,
        payload: InitContractPayload,
    ) -> Result<ContractAddress, DeployError> {
        let manager_account = self.get_manager_account()?;
        let nonce = self.get_nonce(manager_account.address).await?;

        if !nonce.all_final {
            return Err(DeployError::NonceNotFinal);
        }

        let expiry = TransactionTime::from_seconds((chrono::Utc::now().timestamp() + 300) as u64);
        let energy = Energy { energy: 5000 };

        let tx = init_contract(
            &manager_account.account_keys,
            manager_account.address,
            nonce.nonce,
            expiry,
            payload,
            energy,
        );

        let bi = transactions::BlockItem::AccountTransaction(tx);

        let tx_hash = self
            .client
            .clone()
            .send_block_item(&bi)
            .await
            .map_err(|e| DeployError::TransactionRejected(e))?;
        println!("Sent tx: {}", tx_hash.to_string());

        let (_, block_item) = self.client.clone().wait_until_finalized(&tx_hash).await?;

        let contract_init = self.parse_contract_init_event(block_item)?;

        println!(
            "Transaction finalized, tx_hash={} contract=({}, {})",
            tx_hash, contract_init.contract.index, contract_init.contract.subindex,
        );

        Ok(contract_init.contract)
    }

    pub async fn bridge_grant_role(
        &self,
        contract: ContractAddress,
        role: BridgeRoles,
    ) -> Result<(), DeployError> {
        let manager_account = self.get_manager_account()?;

        let address = Address::Account(convert_account_address(&manager_account.address));

        let params = BridgeGrantRoleParams {
            address: address,
            role: role,
        };
        let bytes = concordium_contracts_common::to_bytes(&params);

        let update_payload = transactions::UpdateContractPayload {
            amount: Amount::from_ccd(0),
            address: contract,
            receive_name: OwnedReceiveName::from_str(BRIDGE_GRANT_ROLE_METHOD)?,
            message: bytes.try_into()?,
        };

        let energy = self
            .estimate_energy(update_payload.clone(), manager_account.address)
            .await?;

        self.update_contract(manager_account, update_payload, GivenEnergy::Add(energy))
            .await?;

        Ok(())
    }

    pub async fn token_grant_role(
        &self,
        contract: ContractAddress,
        address: Address,
        role: CIS2BridgeableRoles,
    ) -> Result<(), DeployError> {
        let manager_account = self.get_manager_account()?;

        let params = CIS2BridgeableGrantRoleParams {
            address: address,
            role: role,
        };
        let bytes = concordium_contracts_common::to_bytes(&params);

        let update_payload = transactions::UpdateContractPayload {
            amount: Amount::from_ccd(0),
            address: contract,
            receive_name: OwnedReceiveName::from_str(CIS2_GRANT_ROLE_METHOD)?,
            message: bytes.try_into()?,
        };

        let energy = self
            .estimate_energy(update_payload.clone(), manager_account.address)
            .await?;

        self.update_contract(manager_account, update_payload, GivenEnergy::Add(energy))
            .await?;

        Ok(())
    }

    pub async fn update_contract(
        &self,
        manager_account: AccountData,
        update_payload: UpdateContractPayload,
        energy: GivenEnergy,
    ) -> Result<(), DeployError> {
        let nonce = self.get_nonce(manager_account.address).await?;

        if !nonce.all_final {
            return Err(DeployError::NonceNotFinal);
        }

        let payload = transactions::Payload::Update {
            payload: update_payload,
        };

        let expiry = TransactionTime::from_seconds((chrono::Utc::now().timestamp() + 300) as u64);

        let tx = transactions::send::make_and_sign_transaction(
            &manager_account.account_keys,
            manager_account.address,
            nonce.nonce,
            expiry,
            energy,
            payload,
        );
        let bi = transactions::BlockItem::AccountTransaction(tx);

        let tx_hash = self
            .client
            .clone()
            .send_block_item(&bi)
            .await
            .map_err(|e| DeployError::TransactionRejected(e))?;
        println!("Sent tx: {}", tx_hash.to_string());

        let (_, block_item) = self.client.clone().wait_until_finalized(&tx_hash).await?;

        self.parse_contract_update_event(block_item)?;

        Ok(())
    }

    async fn estimate_energy(
        &self,
        payload: UpdateContractPayload,
        manager_address: AccountAddress,
    ) -> Result<Energy, DeployError> {
        let consensus_info = self.client.clone().get_consensus_status().await?;

        let context = ContractContext {
            invoker: Some(Address::Account(manager_address)),
            contract: payload.address,
            amount: payload.amount,
            method: payload.receive_name,
            parameter: payload.message,
            energy: 100000.into(),
        };

        let result = self
            .client
            .clone()
            .invoke_contract(&consensus_info.best_block, &context)
            .await?;

        match result {
            InvokeContractResult::Failure {
                return_value,
                reason,
                used_energy,
            } => Err(DeployError::InvokeContractFailed(format!(
                "contract invoke failed: {:?}, used_energy={}, return value={:?}",
                reason, used_energy, return_value,
            ))),
            InvokeContractResult::Success {
                return_value: _,
                events: _,
                used_energy,
            } => {
                let e = used_energy.energy;
                println!("Estimated energy: {}", e);
                Ok(Energy { energy: e + 100 })
            }
        }
    }

    pub async fn get_nonce(
        &self,
        address: AccountAddress,
    ) -> Result<AccountNonceResponse, DeployError> {
        let nonce = self.client.clone().get_next_account_nonce(&address).await?;
        Ok(nonce)
    }

    fn get_manager_account(&self) -> Result<AccountData, DeployError> {
        let manager_address: AccountData = serde_json::from_str(self.manager_key.as_str())
            .context("Could not parse the accounts file.")?;
        Ok(manager_address)
    }

    fn parse_deploy_module_event(
        &self,
        block_item: BlockItemSummary,
    ) -> Result<ModuleDeployed, DeployError> {
        match block_item.details {
            BlockItemSummaryDetails::AccountTransaction(a) => match a.effects {
                AccountTransactionEffects::None {
                    transaction_type,
                    reject_reason,
                } => {
                    if transaction_type != Some(TransactionType::DeployModule) {
                        return Err(DeployError::InvalidBlockItem(S(
                            "Expected transaction type to be DeployModule if rejected",
                        )));
                    }

                    match reject_reason {
                        RejectReason::ModuleHashAlreadyExists { contents } => {
                            return Ok(ModuleDeployed {
                                module_ref: contents,
                            })
                        }
                        _ => {
                            return Err(DeployError::TransactionRejectedR(format!(
                                "module deploy rejected with reason: {:?}",
                                reject_reason
                            )))
                        }
                    }
                }
                AccountTransactionEffects::ModuleDeployed { module_ref } => {
                    return Ok(ModuleDeployed {
                        module_ref: module_ref,
                    });
                }
                _ => {
                    return Err(DeployError::InvalidBlockItem(S(
                        "invalid transaction effects",
                    )))
                }
            },
            _ => {
                return Err(DeployError::InvalidBlockItem(S(
                    "Expected Account transaction",
                )));
            }
        }
    }

    fn parse_contract_init_event(
        &self,
        block_item: BlockItemSummary,
    ) -> Result<ContractInitialized, DeployError> {
        match block_item.details {
            BlockItemSummaryDetails::AccountTransaction(a) => match a.effects {
                AccountTransactionEffects::None {
                    transaction_type,
                    reject_reason,
                } => {
                    if transaction_type != Some(TransactionType::InitContract) {
                        return Err(DeployError::InvalidBlockItem(S(
                            "Expected transaction type to be InitContract if rejected",
                        )));
                    }

                    return Err(DeployError::TransactionRejectedR(format!(
                        "contract init rejected with reason: {:?}",
                        reject_reason
                    )));
                }
                AccountTransactionEffects::ContractInitialized { data } => {
                    return Ok(ContractInitialized {
                        contract: data.address,
                    });
                }
                _ => {
                    return Err(DeployError::InvalidBlockItem(S(
                        "invalid transaction effects",
                    )))
                }
            },
            _ => {
                return Err(DeployError::InvalidBlockItem(S(
                    "Expected Account transaction",
                )));
            }
        }
    }

    fn parse_contract_update_event(&self, block_item: BlockItemSummary) -> Result<(), DeployError> {
        match block_item.details {
            BlockItemSummaryDetails::AccountTransaction(a) => match a.effects {
                AccountTransactionEffects::None {
                    transaction_type,
                    reject_reason,
                } => {
                    if transaction_type != Some(TransactionType::Update) {
                        return Err(DeployError::InvalidBlockItem(S(
                            "Expected transaction type to be Update if rejected",
                        )));
                    }

                    return Err(DeployError::TransactionRejectedR(format!(
                        "contract update rejected with reason: {:?}",
                        reject_reason
                    )));
                }
                AccountTransactionEffects::ContractUpdateIssued { effects: _ } => {
                    return Ok(());
                }
                _ => {
                    return Err(DeployError::InvalidBlockItem(S(
                        "invalid transaction effects",
                    )))
                }
            },
            _ => {
                return Err(DeployError::InvalidBlockItem(S(
                    "Expected Account transaction",
                )));
            }
        }
    }
}
