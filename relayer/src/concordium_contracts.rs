use crate::{db::TransactionStatus, ethereum};
use anyhow::Context;
use concordium_rust_sdk::{
    cis2::{TokenAmount, TokenId},
    common::types::{Amount, TransactionTime},
    smart_contracts::common as contracts_common,
    types::{
        hashes::TransactionHash,
        queries::BlockInfo,
        smart_contracts::{ContractContext, InvokeContractResult, OwnedReceiveName, Parameter},
        transactions::{self, BlockItem, EncodedPayload, UpdateContractPayload},
        AbsoluteBlockHeight, Address, BlockItemSummary, ContractAddress, Energy, Nonce,
        RejectReason, WalletAccount,
    },
    v2::{self, BlockIdentifier},
};
use ethabi::ethereum_types::H256;
use futures::{StreamExt, TryStreamExt};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

type EthAddress = [u8; 20];
type ContractTokenAmount = TokenAmount;

#[derive(contracts_common::Serialize, Debug)]
pub struct DepositOperation {
    pub id:       u64,
    pub user:     Address,
    pub root:     EthAddress,
    pub amount:   ContractTokenAmount,
    pub token_id: TokenId,
}

#[derive(contracts_common::Serialize, Debug)]
pub struct TokenMapOperation {
    pub id:    u64,
    pub root:  EthAddress,
    pub child: ContractAddress,
}
#[derive(contracts_common::Serialize, Debug)]
pub enum StateUpdate {
    Deposit(DepositOperation),
    TokenMap(TokenMapOperation),
}

#[derive(Debug, Clone)]
pub struct BridgeManager {
    pub client: BridgeManagerClient,
    sender:     std::sync::Arc<WalletAccount>,
    next_nonce: Nonce,
}

const ALLOWED_DRY_RUN_NRG: Energy = Energy { energy: 1_000_000 };

// TODO: See how to keep this more easily in sync with the contracts.
const DUPLICATE_OPERATION: i32 = -10;

#[derive(Debug, Clone)]
pub enum DryRunReturn {
    Success {
        used_energy: Energy,
        payload:     UpdateContractPayload,
    },
    DuplicateOperation,
    OtherError {
        reason: RejectReason,
    },
}

impl BridgeManager {
    pub async fn new(
        mut client: BridgeManagerClient,
        sender: WalletAccount,
        start_nonce: Option<Nonce>,
    ) -> anyhow::Result<Self> {
        let next_nonce = {
            if let Some(nonce) = start_nonce {
                nonce
            } else {
                let nonce = client
                    .client
                    .get_next_account_sequence_number(&sender.address)
                    .await?;
                // TODO: We could wait here to be sure instead of failing.
                anyhow::ensure!(nonce.all_final, "There are non-finalized transactions.");
                nonce.nonce
            }
        };
        Ok(Self {
            client,
            sender: sender.into(),
            next_nonce,
        })
    }

    fn make_payload(&self, update: &StateUpdate) -> UpdateContractPayload {
        UpdateContractPayload {
            amount:       Amount::from_micro_ccd(0),
            address:      self.client.contract,
            receive_name: OwnedReceiveName::new_unchecked(
                "bridge-manager.receiveStateUpdate".into(),
            ),
            message:      Parameter::new_unchecked(contracts_common::to_bytes(update)),
        }
    }

    pub async fn check_operation_used(&mut self, id: u64) -> anyhow::Result<bool> {
        let ctx = ContractContext {
            invoker:   Some(self.sender.address.into()),
            contract:  self.client.contract,
            amount:    Amount::from_micro_ccd(0),
            method:    OwnedReceiveName::new_unchecked("bridge-manager.checkOperationUsed".into()),
            parameter: Parameter::new_unchecked(id.to_le_bytes().into()),
            energy:    10_000.into(),
        };
        let result = self
            .client
            .client
            .invoke_instance(BlockIdentifier::LastFinal, &ctx)
            .await?;
        match result.response {
            InvokeContractResult::Success { return_value, .. } => {
                let rv = return_value.context("Unexpected response.")?.value;
                if let Some(&first) = rv.first() {
                    Ok(first == 1)
                } else {
                    anyhow::bail!("Invocation returned no data.")
                }
            }
            InvokeContractResult::Failure { .. } => {
                anyhow::bail!("Invocation failed.")
            }
        }
    }

    pub async fn dry_run_state_update(
        &mut self,
        update: &StateUpdate,
    ) -> anyhow::Result<DryRunReturn> {
        let payload = self.make_payload(update);
        let ctx = ContractContext::new_from_payload(
            self.sender.address,
            ALLOWED_DRY_RUN_NRG,
            payload.clone(),
        );
        let result = self
            .client
            .client
            .invoke_instance(BlockIdentifier::LastFinal, &ctx)
            .await?;
        match result.response {
            InvokeContractResult::Success { used_energy, .. } => Ok(DryRunReturn::Success {
                used_energy,
                payload,
            }),
            InvokeContractResult::Failure { reason, .. } => {
                if let RejectReason::RejectedReceive { reject_reason, .. } = reason {
                    if reject_reason == DUPLICATE_OPERATION {
                        Ok(DryRunReturn::DuplicateOperation)
                    } else {
                        Ok(DryRunReturn::OtherError { reason })
                    }
                } else {
                    Ok(DryRunReturn::OtherError { reason })
                }
            }
        }
    }

    pub fn make_state_update_tx(
        &mut self,
        execution_energy: Energy,
        update: &StateUpdate,
    ) -> BlockItem<EncodedPayload> {
        // Set 1d expiry.
        let expiry: TransactionTime =
            TransactionTime::from_seconds((chrono::Utc::now().timestamp() + 24 * 60 * 60) as u64);
        let nonce = self.next_nonce;
        // increase the nonce.
        self.next_nonce.next_mut();

        let tx = transactions::send::update_contract(
            &*self.sender,
            self.sender.address,
            nonce,
            expiry,
            self.make_payload(update),
            execution_energy,
        );
        tx.into()
    }

    pub async fn send_state_update(
        &mut self,
        execution_energy: Energy,
        update: &StateUpdate,
    ) -> anyhow::Result<TransactionHash> {
        let bi = self.make_state_update_tx(execution_energy, &update);
        let hash = self.client.client.send_block_item(&bi).await?;
        Ok(hash)
    }
}

// TODO: We could just import the contract instead of copying this.

#[derive(contracts_common::Serialize, PartialEq, Eq, Debug, Copy, Clone)]
pub enum Roles {
    Admin,
    Mapper,
    StateSyncer,
}

#[derive(Debug, PartialEq, Eq, contracts_common::Serialize)]
pub struct TokenMapEvent {
    pub id:    u64,
    pub root:  EthAddress,
    pub child: ContractAddress,
}

#[derive(Debug, PartialEq, Eq, contracts_common::Serialize)]
pub struct DepositEvent {
    pub id:       u64,
    pub contract: ContractAddress,
    pub amount:   ContractTokenAmount,
    pub token_id: TokenId,
}

#[derive(Debug, PartialEq, Eq, contracts_common::Serialize)]
pub struct WithdrawEvent {
    pub event_index: u64,
    pub contract:    ContractAddress,
    pub amount:      ContractTokenAmount,
    pub ccd_address: Address,
    pub eth_address: EthAddress,
    pub token_id:    TokenId,
}

// A GrantRoleEvent introduced by this smart contract.
#[derive(Debug, PartialEq, Eq, contracts_common::Serialize)]
pub struct GrantRoleEvent {
    /// Address that has been given the role
    address: Address,
    /// The role that has been granted.
    role:    Roles,
}
// A RevokeRoleEvent introduced by this smart contract.
#[derive(Debug, PartialEq, Eq, contracts_common::Serialize)]
pub struct RevokeRoleEvent {
    /// Address that has been revoked the role
    address: Address,
    /// The role that has been revoked.
    role:    Roles,
}

/// Tagged event to be serialized for the event log.
#[derive(Debug, PartialEq, Eq)]
pub enum BridgeEvent {
    TokenMap(TokenMapEvent),
    Deposit(DepositEvent),
    Withdraw(WithdrawEvent),
    GrantRole(GrantRoleEvent),
    RevokeRole(RevokeRoleEvent),
}

impl BridgeEvent {
    pub fn event_index(&self) -> Option<u64> {
        match self {
            BridgeEvent::TokenMap(_) => None,
            BridgeEvent::Deposit(_) => None,
            BridgeEvent::Withdraw(we) => Some(we.event_index),
            BridgeEvent::GrantRole(_) => None,
            BridgeEvent::RevokeRole(_) => None,
        }
    }
}

/// Tag for the BridgeManager TokenMap event.
pub const TOKEN_MAP_EVENT_TAG: u8 = u8::MAX;
/// Tag for the BridgeManager Deposit event.
pub const DEPOSIT_EVENT_TAG: u8 = u8::MAX - 1;
/// Tag for the BridgeManager Withdraw event.
pub const WITHDRAW_EVENT_TAG: u8 = u8::MAX - 2;
pub const GRANT_ROLE_EVENT_TAG: u8 = 0;
pub const REVOKE_ROLE_EVENT_TAG: u8 = 1;

impl contracts_common::Serial for BridgeEvent {
    fn serial<W: contracts_common::Write>(&self, out: &mut W) -> Result<(), W::Err> {
        match self {
            BridgeEvent::TokenMap(event) => {
                out.write_u8(TOKEN_MAP_EVENT_TAG)?;
                event.serial(out)
            }
            BridgeEvent::Deposit(event) => {
                out.write_u8(DEPOSIT_EVENT_TAG)?;
                event.serial(out)
            }
            BridgeEvent::Withdraw(event) => {
                out.write_u8(WITHDRAW_EVENT_TAG)?;
                event.serial(out)
            }
            BridgeEvent::GrantRole(event) => {
                out.write_u8(GRANT_ROLE_EVENT_TAG)?;
                event.serial(out)
            }
            BridgeEvent::RevokeRole(event) => {
                out.write_u8(REVOKE_ROLE_EVENT_TAG)?;
                event.serial(out)
            }
        }
    }
}

impl contracts_common::Deserial for BridgeEvent {
    fn deserial<R: contracts_common::Read>(source: &mut R) -> contracts_common::ParseResult<Self> {
        let tag = source.read_u8()?;
        match tag {
            TOKEN_MAP_EVENT_TAG => TokenMapEvent::deserial(source).map(BridgeEvent::TokenMap),
            DEPOSIT_EVENT_TAG => DepositEvent::deserial(source).map(BridgeEvent::Deposit),
            WITHDRAW_EVENT_TAG => WithdrawEvent::deserial(source).map(BridgeEvent::Withdraw),
            GRANT_ROLE_EVENT_TAG => GrantRoleEvent::deserial(source).map(BridgeEvent::GrantRole),
            REVOKE_ROLE_EVENT_TAG => RevokeRoleEvent::deserial(source).map(BridgeEvent::RevokeRole),
            _ => Err(contracts_common::ParseError::default()),
        }
    }
}

#[derive(Clone, Debug)]
pub struct BridgeManagerClient {
    pub client: v2::Client,
    contract:   ContractAddress,
}

impl BridgeManagerClient {
    pub fn new(client: v2::Client, contract: ContractAddress) -> Self { Self { client, contract } }

    /// Get all the bridge manager event logs.
    pub fn extract_events(
        &mut self,
        summary: &BlockItemSummary,
    ) -> anyhow::Result<Vec<BridgeEvent>> {
        if let Some(logs) = summary.contract_update_logs() {
            let mut out = Vec::new();
            for (ca, section_logs) in logs {
                // Only process logs from the bridge manager contract. Ignore the rest.
                if ca == self.contract {
                    for log in section_logs {
                        // Parsing should never fail. If it does that indicates a configuration
                        // error.
                        let event = contracts_common::from_bytes(log.as_ref())?;
                        out.push(event)
                    }
                }
            }
            Ok(out)
        } else {
            Ok(Vec::new())
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum NodeError {
    /// Error establishing connection.
    #[error("Error connecting to the node {0}.")]
    ConnectionError(tonic::transport::Error),
    /// No finalization in some time.
    #[error("Timeout.")]
    Timeout,
    /// Error establishing connection.
    #[error("Error during query {0}.")]
    NetworkError(#[from] v2::Status),
    /// Query error.
    #[error("Error querying the node {0}.")]
    QueryError(#[from] v2::QueryError),
    /// Query errors, etc.
    #[error("Error querying the node {0}.")]
    OtherError(#[from] anyhow::Error),
}

#[derive(Debug)]
pub enum DatabaseOperation {
    ConcordiumEvents {
        /// Events are from this block.
        block:              BlockInfo,
        /// Events for the given transactions.
        transaction_events: Vec<(TransactionHash, Vec<BridgeEvent>)>,
    },
    EthereumEvents {
        events: ethereum::EthBlockEvents,
    },
    MarkConcordiumTransaction {
        tx_hash: TransactionHash,
        state:   TransactionStatus,
    },
    GetPendingConcordiumTransactions {
        response: tokio::sync::oneshot::Sender<Vec<(TransactionHash, BlockItem<EncodedPayload>)>>,
    },
    StoreEthereumTransaction {
        tx_hash:  H256,
        tx:       ethers::prelude::Bytes,
        response: tokio::sync::oneshot::Sender<(ethers::prelude::Bytes, Vec<u64>)>,
        root:     [u8; 32],
        ids:      Vec<u64>,
    },
    MarkSetMerkleCompleted {
        root:     [u8; 32],
        ids:      Vec<u64>,
        response: tokio::sync::oneshot::Sender<()>,
        success:  bool,
        tx_hash:  H256,
    },
}

/// Return Err if querying the node failed.
/// Return Ok(()) if the channel to the database was closed.
pub async fn use_node(
    mut bridge_manager: BridgeManagerClient,
    sender: tokio::sync::mpsc::Sender<DatabaseOperation>,
    mut height: AbsoluteBlockHeight, // start height
    max_parallel: u32,
    stop_flag: Arc<AtomicBool>,
    max_behind: u32, // maximum number of seconds a node can be behind before it is deemed "behind"
) -> Result<(), NodeError> {
    let mut finalized_blocks = bridge_manager
        .client
        .get_finalized_blocks_from(height)
        .await?;
    let timeout = std::time::Duration::from_secs(max_behind.into());
    while !stop_flag.load(Ordering::Acquire) {
        let (error, chunk) = finalized_blocks
            .next_chunk_timeout(max_parallel as usize, timeout)
            .await
            .map_err(|_| NodeError::Timeout)?;
        let mut futures = futures::stream::FuturesOrdered::new();
        for fb in chunk {
            let mut node = bridge_manager.client.clone();
            futures.push_back(async move {
                let binfo = node.get_block_info(fb.block_hash).await?;
                let events = if binfo.response.transaction_count == 0 {
                    Vec::new()
                } else {
                    node.get_block_transaction_events(fb.block_hash)
                        .await?
                        .response
                        .try_collect()
                        .await?
                };
                Ok::<(BlockInfo, Vec<BlockItemSummary>), anyhow::Error>((binfo.response, events))
            });
        }

        while let Some(result) = futures.next().await {
            let (block, summaries) = result?;
            let mut transaction_events = Vec::new();
            for summary in summaries {
                let events = bridge_manager.extract_events(&summary)?;
                if !events.is_empty() {
                    transaction_events.push((summary.hash, events));
                }
            }
            if sender
                .send(DatabaseOperation::ConcordiumEvents {
                    block,
                    transaction_events,
                })
                .await
                .is_err()
            {
                log::error!("The channel to the database writer has been closed.");
                return Ok(());
            }
            height = height.next();
        }
        if error {
            // we have processed the blocks we can, but further queries on the same stream
            // will fail since the stream signalled an error.
            return Err(NodeError::OtherError(anyhow::anyhow!(
                "Finalized block stream dropped."
            )));
        }
    }
    Ok(())
}

pub async fn concordium_tx_sender(
    mut client: v2::Client,
    mut receiver: tokio::sync::mpsc::Receiver<BlockItem<EncodedPayload>>,
) -> anyhow::Result<()> {
    while let Some(bi) = receiver.recv().await {
        client.send_block_item(&bi).await?;
    }
    Ok(())
}
