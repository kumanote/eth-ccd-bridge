use anyhow::Context;
use concordium_rust_sdk as concordium;
use ethabi::{
    ethereum_types::{Address, H256, U256},
    RawLog,
};
use ethers::{
    abi::AbiDecode,
    prelude::{Filter, Middleware},
};
use sha2::Digest;

use crate::{
    concordium_contracts::DatabaseOperation,
    state_sender::{
        LockedTokenFilter, StateSender, TokenMapAddedFilter, TokenMapRemovedFilter,
        WithdrawEventFilter,
    },
};

#[derive(Debug)]
pub struct EthBlockEvent {
    /// Hash of the transaction that generated the event.
    pub tx_hash:      H256,
    /// Block number for the block this event is in.
    pub block_number: u64,
    /// The event.
    pub event:        EthEvent,
}

/// The relevant events from a single block on Ethereum.
#[derive(Debug)]
pub struct EthBlockEvents {
    /// Maximum block number for events in the list of events below.
    pub last_number: u64,
    /// Events.
    pub events:      Vec<EthBlockEvent>,
}

#[derive(Debug)]
pub enum EthEvent {
    TokenLocked {
        id:               U256,
        depositor:        Address,
        deposit_receiver: concordium::id::types::AccountAddress,
        root_token:       Address,
        vault:            Address,
        amount:           U256,
    },
    TokenMapped {
        id:          U256,
        /// Address of the token on Ethereum.
        root_token:  Address,
        /// The mapped token on Concordium.
        child_token: concordium::types::ContractAddress,
        /// The type of a token. At present two types are supported,
        /// native ETH and ERC20. They have different vault contracts
        /// since ETH does not comply with ERC20 spec.
        token_type:  [u8; 32],
        name:        String,
        decimals:    u8,
    },
    TokenUnmapped {
        id:          U256,
        /// Address of the token on Ethereum.
        root_token:  Address,
        /// The mapped token on Concordium.
        child_token: concordium::types::ContractAddress,
        /// The type of a token. At present two types are supported,
        /// native ETH and ERC20. They have different vault contracts
        /// since ETH does not comply with ERC20 spec.
        token_type:  [u8; 32],
    },
    Withdraw {
        /// Event ID emitted by Ethereum.
        id:                 U256,
        /// Address of the mapped token on Concordium.
        child_token:        concordium::types::ContractAddress,
        /// Amount of token that was withdrawn.
        amount:             U256,
        /// Receiver of withdrawn token.
        receiver:           Address,
        /// Hash of the transaction on Concordium that initiated the withdrawal.
        origin_tx_hash:     concordium::types::hashes::TransactionHash,
        /// Index of the withdraw event on Concordium.
        origin_event_index: u64,
        /// Id of the token on Concordium.
        child_token_id:     u64,
    },
}

impl EthEvent {
    pub fn id(&self) -> U256 {
        match self {
            EthEvent::TokenLocked { id, .. } => *id,
            EthEvent::TokenMapped { id, .. } => *id,
            EthEvent::TokenUnmapped { id, .. } => *id,
            EthEvent::Withdraw { id, .. } => *id,
        }
    }
}

impl TryFrom<LockedTokenFilter> for EthEvent {
    type Error = anyhow::Error;

    fn try_from(value: LockedTokenFilter) -> Result<Self, Self::Error> {
        Ok(Self::TokenLocked {
            id:               value.id,
            depositor:        value.depositor,
            deposit_receiver: concordium::id::types::AccountAddress(value.deposit_receiver),
            root_token:       value.root_token,
            vault:            value.vault,
            amount:           U256::decode(value.deposit_data)?,
        })
    }
}

impl TryFrom<(TokenMapAddedFilter, String, u8)> for EthEvent {
    type Error = anyhow::Error;

    fn try_from(
        (value, name, decimals): (TokenMapAddedFilter, String, u8),
    ) -> Result<Self, Self::Error> {
        Ok(Self::TokenMapped {
            id: value.id,
            root_token: value.root_token,
            child_token: concordium::types::ContractAddress::new(
                value.child_token_index,
                value.child_token_sub_index,
            ),
            token_type: value.token_type,
            name,
            decimals,
        })
    }
}

impl From<TokenMapRemovedFilter> for EthEvent {
    fn from(value: TokenMapRemovedFilter) -> Self {
        Self::TokenUnmapped {
            id:          value.id,
            root_token:  value.root_token,
            child_token: concordium::types::ContractAddress::new(
                value.child_token_index,
                value.child_token_sub_index,
            ),
            token_type:  value.token_type,
        }
    }
}

impl TryFrom<WithdrawEventFilter> for EthEvent {
    type Error = anyhow::Error;

    fn try_from(value: WithdrawEventFilter) -> Result<Self, Self::Error> {
        Ok(Self::Withdraw {
            id:                 value.id,
            child_token:        concordium::types::ContractAddress::new(
                value.ccd_index,
                value.ccd_sub_index,
            ),
            amount:             value.amount,
            receiver:           value.user_wallet,
            origin_tx_hash:     value.ccd_tx_hash.into(),
            origin_event_index: value.ccd_event_index,
            child_token_id:     value.token_id,
        })
    }
}

async fn get_eth_block_events<M: Middleware + 'static>(
    contract: &StateSender<M>,
    block_number: u64,
    upper_block: u64,
) -> anyhow::Result<EthBlockEvents>
where
    M::Error: 'static, {
    log::debug!("Getting block events for block at height {}.", block_number);
    let client = contract.client();
    let mut events = Vec::new();
    let block_filter = |filter: Filter| filter.from_block(block_number).to_block(upper_block);
    use ethers::contract::EthEvent;
    {
        let locked_filter = block_filter(contract.locked_token_filter().filter);
        let logs = client
            .get_logs(&locked_filter)
            .await
            .context("Unable to get LockedToken logs.")?;
        for log in logs {
            // TODO: If log.removed is true do something.
            let decoded = LockedTokenFilter::decode_log(&RawLog {
                topics: log.topics,
                data:   log.data.0.into(),
            })?;
            let event = EthBlockEvent {
                tx_hash:      log
                    .transaction_hash
                    .context("The block is confirmed, so transaction should not be pending.")?,
                block_number: log
                    .block_number
                    .context("Transaction is confirmed, so must have block number.")?
                    .as_u64(),
                event:        decoded.try_into()?,
            };
            log::debug!(
                "Discovered new `Locked` event emitted by {} in block number {}.",
                log.address,
                event.block_number,
            );
            events.push(event);
        }
    }

    {
        let token_map_filter = block_filter(contract.token_map_added_filter().filter);
        let logs = client
            .get_logs(&token_map_filter)
            .await
            .context("Unable to MapAdded logs.")?;
        for log in logs {
            // TODO: If log.removed is true do something.
            let decoded = TokenMapAddedFilter::decode_log(&RawLog {
                topics: log.topics,
                data:   log.data.0.into(),
            })?;
            let (name, decimals) = if decoded.token_type == &sha3::Keccak256::digest("Ether")[..] {
                log::debug!("New mapping for ETH.");
                ("ETH".into(), 18)
            } else {
                log::debug!("New mapping for ERC20 token at {}.", decoded.root_token);
                let contract = crate::erc20::Erc20::new(decoded.root_token, client.clone());
                let name = contract.name().call().await?;
                let decimals = contract.decimals().call().await?;
                (name, decimals)
            };
            let event = EthBlockEvent {
                tx_hash:      log
                    .transaction_hash
                    .context("The block is confirmed, so transaction should not be pending.")?,
                block_number: log
                    .block_number
                    .context("Transaction is confirmed, so must have block number.")?
                    .as_u64(),
                event:        (decoded, name, decimals).try_into()?,
            };
            log::debug!(
                "Discovered new `TokenMapAdded` event emitted by {} in block {}.",
                log.address,
                event.block_number
            );
            events.push(event);
        }
    }

    {
        let token_unmap_filter = block_filter(contract.token_map_removed_filter().filter);
        let logs = client
            .get_logs(&token_unmap_filter)
            .await
            .context("Unable to get MapRemoved logs.")?;
        for log in logs {
            // TODO: If log.removed is true do something.
            let decoded = TokenMapRemovedFilter::decode_log(&RawLog {
                topics: log.topics,
                data:   log.data.0.into(),
            })?;
            let event = EthBlockEvent {
                tx_hash:      log
                    .transaction_hash
                    .context("The block is confirmed, so transaction should not be pending.")?,
                block_number: log
                    .block_number
                    .context("Transaction is confirmed, so must have block number.")?
                    .as_u64(),
                event:        decoded.try_into()?,
            };
            log::debug!(
                "Discovered new `TokenMapRemoved` event emitted by {} in block {}.",
                log.address,
                event.block_number
            );
            events.push(event);
        }
    }

    {
        let withdraw_event_filter = block_filter(contract.withdraw_event_filter().filter);
        let logs = client
            .get_logs(&withdraw_event_filter)
            .await
            .context("Unable to get Withdraw logs.")?;
        for log in logs {
            // TODO: If log.removed is true do something.
            let decoded = WithdrawEventFilter::decode_log(&RawLog {
                topics: log.topics,
                data:   log.data.0.into(),
            })?;
            let event = EthBlockEvent {
                tx_hash:      log
                    .transaction_hash
                    .context("The block is confirmed, so transaction should not be pending.")?,
                block_number: log
                    .block_number
                    .context("Transaction is confirmed, so must have block number.")?
                    .as_u64(),
                event:        decoded.try_into()?,
            };
            log::debug!(
                "Discovered new `WithdrawEvent` event emitted by {} in block {}.",
                log.address,
                event.block_number
            );
            events.push(event);
        }
    }
    events.sort_by(|x, y| x.event.id().cmp(&y.event.id()));
    Ok(EthBlockEvents {
        events,
        last_number: upper_block,
    })
}

// TODO: Make this configurable.
const NUM_CONFIRMATIONS: u64 = 10;

// // TODO: Do not go beyond where the contract exists.
// async fn find_block<M: Middleware>(
//     contract: &StateSender<M>,
//     manager: &mut BridgeManager,
//     default_number: u64,
// ) -> anyhow::Result<(H256, u64, u64)>
// where
//     M::Error: 'static, {
//     let client = contract.client();
//     // Since we never register any events for blocks that are nearer than
//     // NUM_CONFIRMATIONS this is safe.
//     let end = client
//         .get_block_number()
//         .await?
//         .as_u64()
//         .saturating_sub(NUM_CONFIRMATIONS);
//     let mut block_number = end;
//     let mut step = 1;
//     while block_number > default_number {
//         log::trace!("Trying at height {}.", block_number);
//         // TODO: It is not ideal to always query to the end. But it is
// simpler.         // Revise.
//         let mut events = get_eth_block_events(&contract, block_number,
// end).await?;         events.events.retain(|e| {
//             matches!(
//                 e.event,
//                 EthEvent::TokenLocked { .. } | EthEvent::TokenMapped { .. }
//             )
//         });
//         events.events.sort_by_key(|e| e.block_number);
//         if let Some((first, rest)) = events.events.split_first() {
//             if manager
//                 .check_operation_used(first.event.id().as_u64())
//                 .await?
//             {
//                 for e in rest {
//                     if
// !manager.check_operation_used(e.event.id().as_u64()).await? {
// let block_number = e.block_number;                         let block_hash =
// contract                             .client()
//                             .get_block(block_number)
//                             .await?
//                             .context("Block at given default height not
// present.")?                             .hash
//                             .context("Block at given default height does not
// have a hash.")?;                         return Ok((block_hash, block_number,
// end));                     }
//                 }
//                 // If we are here then all the operations are used. So we
// return the last block.                 break;
//             } else {
//                 block_number = block_number.saturating_sub(step);
//                 step = std::cmp::min(10_000, step * 2);
//             }
//         } else {
//             block_number = block_number.saturating_sub(step);
//             step = std::cmp::min(10_000, step * 2);
//         }
//     }
//     let block_number = if block_number <= default_number {
//         default_number
//     } else {
//         end
//     };
//     let block_hash = contract
//         .client()
//         .get_block(block_number)
//         .await?
//         .context("Block at given height not present.")?
//         .hash
//         .context("Block at given height does not have a hash.")?;
//     return Ok((block_hash, block_number, end));
// }

/// Write "finalized" ethereum blocks to the provided channel.
pub async fn watch_eth_blocks<M: Middleware + 'static>(
    contract: StateSender<M>,
    actions_channel: tokio::sync::mpsc::Sender<DatabaseOperation>,
    mut block_number: u64,
    mut upper_block: u64,
) -> anyhow::Result<()>
where
    M::Error: 'static, {
    let mut interval = tokio::time::interval(std::time::Duration::from_millis(5000));
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    let client = contract.client();
    loop {
        let number = client.get_block_number().await?;
        if block_number.saturating_add(NUM_CONFIRMATIONS) <= number.as_u64() {
            // TODO: Handle sending error here.
            let block_events = get_eth_block_events(&contract, block_number, upper_block).await?;
            actions_channel
                .send(DatabaseOperation::EthereumEvents {
                    events: block_events,
                })
                .await?;
            block_number = upper_block + 1;
            upper_block = block_number;
        } else {
            // else wait for the next block.
            interval.tick().await;
        }
    }
}
