use anyhow::Context;
use concordium_rust_sdk::{
    cis2,
    types::{hashes::TransactionHash, ContractAddress},
};
use ethabi::{
    ethereum_types::{H160, H256, U256},
    RawLog, Token,
};
use ethers::{
    prelude::{Middleware, Signer},
    utils::rlp::Rlp,
};
use rs_merkle::{Hasher, MerkleProof, MerkleTree};
use std::{collections::BTreeMap, sync::Arc};

use crate::{
    concordium_contracts::WithdrawEvent,
    db::{DatabaseOperation, MerkleUpdate},
    root_chain_manager::BridgeManager,
    state_sender,
};

pub fn make_proof<A: PartialEq + Eq>(
    leaves: impl IntoIterator<Item = (A, [u8; 32])>,
    elem: A,
) -> Option<MerkleProof<Keccak256Algorithm>> {
    let mut tree = MerkleTree::<Keccak256Algorithm>::new();
    let mut index = Vec::new();
    for (i, (v, leaf)) in leaves.into_iter().enumerate() {
        tree.insert(leaf);
        if v == elem {
            index.push(i)
        }
    }
    if !index.is_empty() {
        tree.commit();
        Some(tree.proof(&index))
    } else {
        None
    }
}

pub struct MerkleData {
    /// The child token address that is being withdrawn.
    pub child_token:          ContractAddress,
    /// The amount of the token that is being withdrawn.
    pub amount:               U256,
    /// The target address of the withdrawal. The Ethereum wallet.
    pub user_wallet:          H160,
    /// The transaction hash
    pub transaction_hash:     TransactionHash,
    /// Event id on Concordium.
    pub transaction_event_id: u64,
    /// Id of the token that is being withdrawn.
    pub token_id:             u64,
}

impl MerkleData {
    pub fn encode(&self) -> Vec<u8> {
        let ccd_index = Token::Uint(U256::from(self.child_token.index));
        let ccd_sub_index = Token::Uint(U256::from(self.child_token.subindex));
        let amount = Token::Uint(self.amount);
        let withdraw_to_wallet = Token::Address(self.user_wallet);
        let transaction_hash = Token::FixedBytes(self.transaction_hash.as_ref().to_vec());
        let transaction_event_id = Token::Uint(U256::from(self.transaction_event_id));
        let token_id = Token::Uint(U256::from(self.token_id));

        ethabi::encode(&vec![
            ccd_index,
            ccd_sub_index,
            amount,
            withdraw_to_wallet,
            transaction_hash,
            transaction_event_id,
            token_id,
        ])
    }
}

#[derive(Clone)]
pub struct Keccak256Algorithm {}

impl rs_merkle::Hasher for Keccak256Algorithm {
    type Hash = [u8; 32];

    fn hash(data: &[u8]) -> [u8; 32] {
        use sha3::Digest;
        sha3::Keccak256::digest(data).into()
    }

    // The OpenZeppelin contract computes the hash of inner nodes by ordering them
    // lexicographically first. So we must override the default implementation.
    fn concat_and_hash(left: &Self::Hash, right: Option<&Self::Hash>) -> Self::Hash {
        use sha3::Digest;
        let mut hasher = sha3::Keccak256::new();
        match right {
            Some(right_node) => {
                if left <= right_node {
                    hasher.update(left);
                    hasher.update(right_node);
                } else {
                    hasher.update(right_node);
                    hasher.update(left);
                }
                hasher.finalize().into()
            }
            None => *left,
        }
    }

    fn hash_size() -> usize { std::mem::size_of::<Self::Hash>() }
}

pub fn convert_from_token_amount(a: &cis2::TokenAmount) -> U256 {
    let le_bytes = a.0.to_bytes_le();
    U256::from_little_endian(&le_bytes)
}

pub fn build_merkle_tree(
    events: &[(TransactionHash, WithdrawEvent)],
) -> anyhow::Result<MerkleTree<Keccak256Algorithm>> {
    let mut tree = MerkleTree::new();
    for (transaction_hash, we) in events {
        let data = MerkleData {
            child_token:          we.contract,
            amount:               convert_from_token_amount(&we.amount),
            user_wallet:          we.eth_address.into(),
            transaction_hash:     *transaction_hash,
            transaction_event_id: we.event_index,
            token_id:             u64::from_le_bytes(
                Vec::from(we.token_id.clone())
                    .try_into()
                    .map_err(|_| anyhow::anyhow!("Invalid token id."))?,
            ),
        };
        let hash = Keccak256Algorithm::hash(&data.encode());
        tree.insert(hash);
    }
    tree.commit();
    Ok(tree)
}

pub struct MerkleSetterClient<M, S> {
    /// The client used for setting merkle roots.
    pub root_manager:           BridgeManager<M>,
    pub signer:                 S,
    pub max_gas_price:          U256,
    pub max_gas:                U256,
    pub next_nonce:             U256,
    /// Minimum number of seconds between merkle root updates.
    pub update_interval:        chrono::Duration,
    /// List of event indices and the hashes
    pub current_leaves:         Arc<std::sync::Mutex<BTreeMap<u64, [u8; 32]>>>,
    pub max_marked_event_index: Option<u64>,
}

pub fn make_event_leaf_hash(
    transaction_hash: TransactionHash,
    we: &WithdrawEvent,
) -> anyhow::Result<[u8; 32]> {
    let data = MerkleData {
        child_token: we.contract,
        amount: convert_from_token_amount(&we.amount),
        user_wallet: we.eth_address.into(),
        transaction_hash,
        transaction_event_id: we.event_index,
        token_id: u64::from_le_bytes(
            Vec::from(we.token_id.clone())
                .try_into()
                .map_err(|_| anyhow::anyhow!("Invalid token id."))?,
        ),
    };
    Ok(Keccak256Algorithm::hash(&data.encode()))
}

impl<M, S> MerkleSetterClient<M, S> {
    pub fn new(
        root_manager: BridgeManager<M>,
        signer: S,
        max_gas_price: U256,
        max_gas: U256,
        next_nonce: U256,
        pending_merkle_set: &Option<(H256, ethers::prelude::Bytes, u64, [u8; 32], Vec<u64>)>,
        update_interval: chrono::Duration,
        pending_withdrawals: Vec<(TransactionHash, WithdrawEvent)>,
        max_marked_event_index: Option<u64>,
    ) -> anyhow::Result<Self> {
        let next_nonce = if let Some((_, bytes, _, _, _)) = pending_merkle_set {
            log::debug!("There is a pending Ethereum transaction.");
            let (tx, _) = ethers::types::transaction::eip2718::TypedTransaction::decode_signed(
                &Rlp::new(&bytes),
            )?;
            std::cmp::max(
                next_nonce,
                tx.nonce().context("Nonce must have been set.")? + 1,
            )
        } else {
            next_nonce
        };
        let msc = Self {
            root_manager,
            signer,
            max_gas_price,
            max_gas,
            next_nonce,
            update_interval,
            current_leaves: Arc::new(std::sync::Mutex::new(BTreeMap::new())),
            max_marked_event_index,
        };
        for (tx_hash, we) in pending_withdrawals {
            let event_index = we.event_index;
            let merkle_event_hash = make_event_leaf_hash(tx_hash, &we)?;
            add_withdraw_event(&msc.current_leaves, event_index, merkle_event_hash)?;
        }
        Ok(msc)
    }
}

fn add_withdraw_event(
    leaves: &Arc<std::sync::Mutex<BTreeMap<u64, [u8; 32]>>>,
    event_index: u64,
    hash: [u8; 32],
) -> anyhow::Result<()> {
    let mut lock = leaves
        .lock()
        .map_err(|_| anyhow::anyhow!("Unable to acquire lock."))?;
    lock.insert(event_index, hash);
    Ok(())
}

fn remove_withdraw_event(
    leaves: &Arc<std::sync::Mutex<BTreeMap<u64, [u8; 32]>>>,
    event_index: u64,
) -> anyhow::Result<Option<[u8; 32]>> {
    let mut lock = leaves
        .lock()
        .map_err(|_| anyhow::anyhow!("Unable to acquire lock."))?;
    Ok(lock.remove(&event_index))
}
pub enum SetMerkleRootResult {
    SetTransaction {
        tx_hash: H256,
        raw_tx:  ethers::prelude::Bytes,
        root:    [u8; 32],
        ids:     Vec<u64>,
    },
    GasTooHigh {
        max_gas_price:     U256,
        current_gas_price: U256,
    },
    NoPendingWithdrawals,
}

impl<M: Middleware, S: Signer> MerkleSetterClient<M, S>
where
    M::Error: 'static,
    S::Error: 'static,
{
    pub async fn set_merkle_root(&mut self) -> anyhow::Result<SetMerkleRootResult> {
        let mut tree = MerkleTree::<Keccak256Algorithm>::new();
        let ids = {
            let leaves = self.current_leaves.lock().map_err(|_| {
                anyhow::anyhow!("Unable to set merkle root, unable to acquire lock.")
            })?;
            if leaves.last_key_value().map(|x| *x.0) <= self.max_marked_event_index {
                // Nothing to do.
                return Ok(SetMerkleRootResult::NoPendingWithdrawals);
            }
            let mut ids = Vec::with_capacity(leaves.len());
            for (&id, hash) in leaves.iter() {
                tree.insert(*hash);
                ids.push(id);
            }
            ids
        }; // drop lock.
        tree.commit();
        if let Some(new_root) = tree.root() {
            let client = self.root_manager.client();
            let current_gas_price = client.get_gas_price().await?;
            log::debug!("Current gas price is {}.", current_gas_price);
            if current_gas_price <= self.max_gas_price {
                let call = self.root_manager.set_merkle_root(new_root);
                let mut tx = call.tx;
                tx.set_chain_id(self.signer.chain_id())
                    .set_nonce(self.next_nonce)
                    .set_gas_price(current_gas_price)
                    .set_gas(self.max_gas);
                self.next_nonce += 1.into();
                let signature = self.signer.sign_transaction(&tx).await?;
                let tx_hash = tx.hash(&signature);
                let raw_tx = tx.rlp_signed(&signature);
                Ok(SetMerkleRootResult::SetTransaction {
                    tx_hash,
                    raw_tx,
                    root: new_root,
                    ids,
                })
                // Next, store the transaction in the database.
                // Then send it.
                // Then mark it as sent in the database.
            } else {
                return Ok(SetMerkleRootResult::GasTooHigh {
                    max_gas_price: self.max_gas_price,
                    current_gas_price,
                });
            }
        } else {
            Ok(SetMerkleRootResult::NoPendingWithdrawals)
        }
    }
}

pub async fn send_merkle_root_updates<M: Middleware + 'static, S: Signer + 'static>(
    client: MerkleSetterClient<M, S>,
    pending_merkle_set: Option<(H256, ethers::prelude::Bytes, u64, [u8; 32], Vec<u64>)>,
    mut receiver: tokio::sync::mpsc::Receiver<MerkleUpdate>,
    db_sender: tokio::sync::mpsc::Sender<DatabaseOperation>,
    num_confirmations: u64,
    mut stop: tokio::sync::watch::Receiver<()>,
) -> anyhow::Result<()>
where
    M::Error: 'static,
    S::Error: 'static, {
    let mut pending = None;
    // Check if we need to resubmit the pending transaction.
    if let Some((tx_hash, raw_tx, _timestamp, root, ids)) = pending_merkle_set {
        let ethereum_client = client.root_manager.client();
        let status = ethereum_client
            .get_transaction(tx_hash)
            .await
            .context("Unable to get transaction status.")?;
        if status.is_none() {
            let _pending_tx = ethereum_client
                .send_raw_transaction(raw_tx)
                .await
                .context("Unable to send raw transaction.")?;
        }
        pending = Some((tx_hash, root, ids))
    }
    let leaves = client.current_leaves.clone();
    let sender_handle = tokio::spawn(ethereum_tx_sender(
        client,
        db_sender,
        pending,
        num_confirmations,
        stop.clone(),
    ));
    while let Some(mu) = tokio::select! {
        _ = stop.changed() => None,
        v = receiver.recv() => v
    } {
        match mu {
            MerkleUpdate::NewWithdraws { withdraws } => {
                for (event_index, merkle_hash) in withdraws {
                    log::debug!("New withdraw event with index {event_index}.");
                    add_withdraw_event(&leaves, event_index, merkle_hash)?;
                }
            }
            MerkleUpdate::WithdrawalCompleted {
                receiver: _,
                original_event_index,
            } => {
                if remove_withdraw_event(&leaves, original_event_index)?.is_none() {
                    log::error!(
                        "An event {original_event_index} marked as withdrawn, but was not known."
                    );
                }
            }
        }
    }
    // TODO: Handle stop flag.
    let () = sender_handle.await??;
    Ok(())
}

async fn ethereum_tx_sender<M: Middleware, S: Signer>(
    mut client: MerkleSetterClient<M, S>,
    db_sender: tokio::sync::mpsc::Sender<DatabaseOperation>,
    mut pending: Option<(H256, [u8; 32], Vec<u64>)>,
    num_confirmations: u64,
    mut stop: tokio::sync::watch::Receiver<()>,
) -> anyhow::Result<()>
where
    M::Error: 'static,
    S::Error: 'static, {
    let mut send_interval = tokio::time::interval_at(
        tokio::time::Instant::now() + client.update_interval.to_std()?,
        client.update_interval.to_std()?,
    );
    send_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    'outer: while !stop.has_changed().unwrap_or(true) {
        // Handle followup for any pending transaction firs.
        if pending.is_some() {
            let mut check_interval = tokio::time::interval(std::time::Duration::from_secs(10));
            check_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
            while let Some((pending_hash, root, ids)) = pending {
                let stop = tokio::select! {
                    _ = stop.changed() => true,
                    _ = check_interval.tick() => false,
                };
                if stop {
                    break 'outer;
                }
                let result = client
                    .root_manager
                    .client()
                    .get_transaction_receipt(pending_hash)
                    .await?;
                if let Some(receipt) = result {
                    if let Some(bn) = receipt.block_number {
                        let current_block = client.root_manager.client().get_block_number().await?;
                        if bn.saturating_add(num_confirmations.into()) <= current_block.into() {
                            let mut found = false;
                            for log in receipt.logs {
                                use ethers::contract::EthEvent;
                                let sig = state_sender::MerkleRootFilter::signature();
                                if log.topics.first().map_or(false, |s| s == &sig) {
                                    let emitted_root =
                                        state_sender::MerkleRootFilter::decode_log(&RawLog {
                                            topics: log.topics,
                                            data:   log.data.0.into(),
                                        })?;
                                    anyhow::ensure!(
                                        emitted_root.root == root,
                                        "Transaction emitted an incorrect Merkle root."
                                    );
                                    found = true;
                                }
                            }
                            log::info!("Withdrawal transaction confirmed in block number {bn}.");
                            if !found {
                                log::error!(
                                    "A transaction with hash {pending_hash} did not set a Merkle \
                                     root."
                                )
                            };
                            let (response, receiver) = tokio::sync::oneshot::channel();
                            let last_id = ids.last().copied();
                            db_sender
                                .send(DatabaseOperation::MarkSetMerkleCompleted {
                                    root,
                                    ids,
                                    response,
                                    success: found,
                                    tx_hash: pending_hash,
                                })
                                .await?;
                            let () = receiver.await?;
                            if found {
                                log::info!(
                                    "New merkle root set to {} and marked in the database.",
                                    TransactionHash::from(root)
                                );
                                // Assuming that the order is preserved by the channel.
                                // Mark the high watermark of processd ids.
                                client.max_marked_event_index = last_id;
                            }
                            pending = None;
                        } else {
                            log::debug!(
                                "Ethereum transaction {pending_hash} is in block {bn}, but not \
                                 yet confirmed."
                            );
                            pending = Some((pending_hash, root, ids));
                        }
                    } else {
                        anyhow::bail!(
                            "A submitted transaction is confirmed, but without a block hash."
                        );
                    }
                } else {
                    log::debug!("Ethereum transaction {pending_hash} is pending.");
                    pending = Some((pending_hash, root, ids));
                }
            }
        }

        let stop = tokio::select! {
            _ = stop.changed() => true,
            _ = send_interval.tick() => false,
        };
        if stop {
            break 'outer;
        }
        // Now check if we have to send a new one
        {
            // only send new transaction if there is no pending transaction.
            match client.set_merkle_root().await? {
                SetMerkleRootResult::SetTransaction {
                    tx_hash,
                    raw_tx,
                    root,
                    ids,
                } => {
                    log::debug!("New merkle root to be set using transaction {tx_hash}.");
                    let (response, receiver) = tokio::sync::oneshot::channel();
                    db_sender
                        .send(DatabaseOperation::StoreEthereumTransaction {
                            tx_hash,
                            tx: raw_tx,
                            response,
                            ids,
                            root,
                        })
                        .await?;
                    let (raw_tx, ids) = receiver.await?;
                    let ethereum_client = client.root_manager.client();
                    log::debug!("Sending SetMerkleRoot transaction.");
                    let pending_tx = ethereum_client.send_raw_transaction(raw_tx).await?;
                    pending = Some((pending_tx.tx_hash(), root, ids));
                }
                SetMerkleRootResult::GasTooHigh {
                    max_gas_price,
                    current_gas_price,
                } => {
                    log::warn!(
                        "Ethereum transaction price is too high {current_gas_price} > \
                         {max_gas_price}. Waiting."
                    );
                }
                SetMerkleRootResult::NoPendingWithdrawals => {
                    log::debug!("No pending withdrawals. Doing nothing.");
                }
            }
        }
    }
    Ok(())
}
