## Relayer

The relayer is the component of the bridge that monitors both the Ethereum and
Concordium chains and acts on events on both of them by submitting transactions
on the other chain.

The relayer collects events and auxiliary data in a PostgreSQL database. The
high-level design of the relayer is as follows.

The relayer consists of a number of tasks that work concurrently.
- A task for looking at events on the Ethereum chain, using the provided API
  URL, e.g., Infura.
- A task for looking at events on Concordium, using a connection to the node
  that is provided.
- A task for sending transactions to the Concordium chain.
- A task for sending transactions to the Etheruem chain (this is called the
  MerkleClient in the code).
- A database task that has exclusive access to the database. It communicates
  with other tasks via MPSC channels. This is used to ensure atomicity of state
  updates, and to make it simpler to do reconnects, since they have to be done
  in a single place only. All processing is done per block and checkpoints are
  stored in the database when blocks are processed.

The overall flow is as follows
- when relevant events are observed on the chain they are written to the
  database.
- if any actions are needed as a result of these events these actions are
  written to the database in the same database transaction as the events
  themselves.
- after the database transaction is committed the relevant transactions are sent
  to either Concordium or Ethereum chains.
- when transactions are sent to Concordium we don't do anything afterwards and
  we rely on the monitoring task to observe when the transaction is finalized
  and its effects.
- when a transaction is send to Ethereum we follow it since we need to update
  the database when it is finalized with auxiliary data needed by the API server
  to produce Merkle proofs.

There is retry logic for events that are deemed transient, and the service will
try for some time to re-establish the connections to Ethereum APIs, Concordium
node, and the database. In case any of the tasks terminate then all are killed
and the service will stop. A task ending prematurely indicates a bug, or failure
to reconnect for some time.

## TODO: Configuration options.

## Building

The project is a pure Rust project, and can be build by running

```shell
cargo build --release
```

The minimum supported Rust version is 1.67. There are issues with older version,
some with dependencies, and a compiler bug in 1.65 which causes compilation failure.

This produces a single binary `target/release/ccdeth_relayer`.

**Make sure that you have checked and initialized submodules before the build**
e.g., using
```
git submodule update --init --recursive
```

## Generation of clients for Ethereum contracts.

The relayer needs to interact with the root chain manager on Ethereum, and
listen for events emitted by the state sender contract. The `ethers.rs` library
can generate these clients from the ABI of those contracts (specifically
`src/erc20.rs`, `src/root_chain_manager.rs` and `src/state_sender.rs` are
generated). The build script for the relayer can be used to generate these
clients if the build is run using `generate-client` feature, i.e., 

```
cargo build --feature=generate-client
```

This should only be necessary if the ABI of those contracts changes.
