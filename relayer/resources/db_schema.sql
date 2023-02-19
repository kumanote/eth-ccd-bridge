-- Schema for the database maintained by the relayer.
-- This is intended to work with PostgreSQL only.

-- Create datatypes for enums to provide type safety.
-- Since this is run on every start of the service
-- we handle the case where the types already exist.
-- This is done by catching the duplicate_object exception, since
-- Postgres does not provide `CREATE TYPE IF NOT EXISTS` like it does
-- for creating tables.

-- Status of a concordium transaction we have submitted.
DO $$ BEGIN
CREATE TYPE concordium_transaction_status AS ENUM (
   'pending',
   'failed',
   'finalized',
   'missing'
   );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Type of a concordium event we keep track of.
DO $$ BEGIN
CREATE TYPE concordium_event_type AS ENUM (
    'token_map',
    'deposit',
    'withdraw',
    'grant_role',
    'revoke_role'
   );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Status of an Ethereum transaction we have submitted.
DO $$ BEGIN
CREATE TYPE ethereum_transaction_status AS ENUM (
    'pending',
    'confirmed',
    'missing'
   );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Type of a network, used for checkpointing.
DO $$ BEGIN
CREATE TYPE network AS ENUM (
    'ethereum',
    'concordium'
   );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- List of concordium transactions we have submitted.
CREATE TABLE IF NOT EXISTS concordium_transactions (
       id SERIAL8 PRIMARY KEY UNIQUE,
       -- Hash of the transaction we have submitted. This is for indexing,
       -- even though it can be derived from the `tx` field.
       tx_hash BYTEA NOT NULL,
       -- The transaction serialized as a BlockItem, exactly as it can be
       -- submitted to the chain.
       tx BYTEA NOT NULL,
       -- The hash of the Ethereum transaction that caused us to send this
       -- transaction. This is not necessarily unique, i.e., we can send
       -- multiple Concordium transactions for a single Ethereum one.
       origin_tx_hash BYTEA NOT NULL,
       -- Timestamp in milliseconds when the transaction was inserted
       timestamp INT8 NOT NULL,
       -- Status. Starts as 'pending'.
       status concordium_transaction_status NOT NULL,
       CONSTRAINT concordium_transactions_tx_hash_unique UNIQUE (tx_hash)
       );

-- |Events recorded from the bridge manager contract on Concordium.
CREATE TABLE IF NOT EXISTS concordium_events (
       id SERIAL8 PRIMARY KEY UNIQUE,
       -- Hash of the transaction that logged the event. In principle
       -- a transaction can emit multiple events so this is not unique.
       tx_hash BYTEA NOT NULL,
       -- Event index of the event if present. This is only for events
       -- generated by the concordium contracts. Meaning Withdraw events.
       event_index INT8,
       -- Event index of the event if present. This is only for events
       -- generated by the Ethereum contracts to which we are reacting.
       -- That means concretely token mapping and deposits.
       origin_event_index INT8,
       -- The type of event.
       event_type concordium_event_type NOT NULL,
       -- If withdraw, the receiver of the token (an Ethereum address).
       -- Otherwise NULL.
       receiver BYTEA,
       -- Serialized event, exactly as logged by the contract.
       event_data BYTEA NOT NULL,
       -- Index of the child contract, if deposit or withdraw, otherwise NULL.
       child_index INT8,
       -- Subindex of the child contract, if deposit or withdraw, otherwise NULL.
       child_subindex INT8,
       -- Amount withdrawn as a decimal string, if withdrawal. Otherwise NULL.
       amount TEXT,
       -- Whether the withdrawal has already been completed. If so, then
       -- it is the hash of the transaction that completed it (withdrawn the tokens).
       processed BYTEA,
       -- The latest Merkle root registered in the Ethereum contract that
       -- contains the event. Only applies to Withdraw events. NULL means that
       -- it is not yet registered.
       root BYTEA,
       -- This is an auxiliary field used to keep track of indices of approved
       -- withdrawals. When we submit the SetMerkleRoot transaction we set the
       -- tentative pending root for those withdrawals that are approved by that
       -- root. Once that transaction is confirmed we clear the pending root and
       -- set the root instead.
       pending_root BYTEA,
       CONSTRAINT concordium_events_event_index_unique UNIQUE (event_index),
       CONSTRAINT concordium_events_origin_event_index_unique UNIQUE (origin_event_index)
       );

-- Index for the benefit of the API server, so that it can efficiently construct
-- the Merkle proof for the current root.
CREATE INDEX IF NOT EXISTS approved_withdrawals_index ON concordium_events (root);

-- Mapping of tokens 
CREATE TABLE IF NOT EXISTS token_maps (
       id SERIAL8 PRIMARY KEY UNIQUE,
       -- The address of a root token on Ethereum.
       root BYTEA NOT NULL,
       -- Contract address of the mapped token on Concordium.
       child_index INT8 NOT NULL,
       child_subindex INT8 NOT NULL,
       -- Name of the token on Ethereum.
       eth_name TEXT NOT NULL,
       -- The number of decimals of the token.
       decimals SMALLINT NOT NULL,
       CONSTRAINT token_maps_root_unique UNIQUE (root)
       );

-- Withdraw events processed on Ethereum. This is completed withdraws.
CREATE  TABLE IF NOT EXISTS ethereum_withdraw_events (
       id SERIAL8 PRIMARY KEY UNIQUE,
       -- Hash of the transaction that logged the event.
       tx_hash BYTEA NOT NULL,
       -- Event index emitted by the Ethereum StateSender. This is the
       -- index of the event.
       event_index INT8 NOT NULL,
       -- Amount withdrawn.
       amount TEXT NOT NULL,
       -- Receiver of the withdrawal.
       receiver BYTEA NOT NULL,
       -- Hash of the transaction on Concordium that initiated the withdrawal.
       origin_tx_hash BYTEA NOT NULL,
       -- Index of the original Withdraw event emitted by the BridgeManager on
       -- Concordium.
       origin_event_index INT8 NOT NULL,
       CONSTRAINT ethereum_withdraw_events_event_index_unique UNIQUE (event_index),
       CONSTRAINT ethereum_withdraw_events_origin_event_index_unique UNIQUE (origin_event_index)
       );

-- Deposits on Ethereum that have been processed by the relayer.
-- Processed means that a corresponding transaction was sent to Concordium.
CREATE TABLE IF NOT EXISTS ethereum_deposit_events (
       id SERIAL8 PRIMARY KEY UNIQUE,
       -- Hash of the transaction on Ethereum that initiated the deposit.
       origin_tx_hash BYTEA NOT NULL,
       -- Index of the deposit event emitted by the StateSender on Ethereum.
       origin_event_index INT8 NOT NULL,
       -- Amount deposited as a decimal string.
       amount TEXT NOT NULL,
       -- Depositor address.
       depositor BYTEA NOT NULL,
       -- Address of the root token.
       root_token BYTEA NOT NULL,
       -- If completed, this is the hash of the concordium transaction that did it.
       -- NULL otherwise.
       tx_hash BYTEA,
       CONSTRAINT ethereum_deposit_events_origin_event_index_unique UNIQUE (origin_event_index)
       );

-- Transactions that we will or have submitted to the Etheruem chain. This is
-- used to handle restarts of the service, so we don't lose track of any data we
-- have sent.
CREATE TABLE IF NOT EXISTS ethereum_transactions (
       id SERIAL8 PRIMARY KEY UNIQUE,
       -- Hash of the tranasction.
       tx_hash BYTEA NOT NULL,
       -- The actual transaction, for retries. This is signed already
       -- so cannot be manipulated.
       tx BYTEA NOT NULL,
       -- When the transaction was inserted.
       timestamp INT8 NOT NULL,
       status ethereum_transaction_status NOT NULL,
       CONSTRAINT ethereum_transactions_tx_hash_unique UNIQUE (tx_hash)
       );

-- Checkpoints so we know where to continue when restarting.
CREATE TABLE IF NOT EXISTS checkpoints (
       network network PRIMARY KEY UNIQUE,
       last_processed_height INT8 NOT NULL
);

-- The current Merkle root. This is only written by the relayer, and is read by
-- the API server when it needs to construct a new Merkle proof.
CREATE TABLE IF NOT EXISTS merkle_roots (
       id SERIAL8 PRIMARY KEY UNIQUE,
       root BYTEA NOT NULL
);
