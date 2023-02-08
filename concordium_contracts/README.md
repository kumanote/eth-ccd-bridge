# Concordium ethereum bridge contracts

This repository contains the Concordium contracts for Concordium-Ethereum bridge.

There are 3 directories here.

- bridge-manager: This contract handles tokens added to the bridge, deposits (mint) and withdraws (burn)
- cis2-bridgeable: A superset of CIS2 token for wrapped ethereum tokens
- deploy-scripts: Scripts to deploy and configure the bridge contracts on testnet

### Installation:

```
$ # install cargo concordium build helper
$ curl https://distribution.concordium.software/tools/linux/cargo-concordium_2.5.0 > $HOME/.cargo/bin/cargo-concordium
$ chmod +x $HOME/.cargo/bin/cargo-concordium

$ # install wasm toolchain
$ rustup target add wasm32-unknown-unknown --toolchain stable

$ # pull git submodules
$ git submodule init && git submodule update
$ cd deploy-scripts/deps/concordium-rust-sdk && git submodule init && git submodule update
```

### Building

```
$ cd deploy-scripts
$ make
```

### Configuration

```
$ cat .env
export CONCORDIUM_URL="http://139.59.140.84:10001"
export CONCORDIUM_TOKEN="rpcadmin"
export CONCORDIUM_MANAGER_ACCOUNT_FILE="./data/account-0.json"
```

### Deploying contracts to testnet

The deployer scripts crate handles all of the deployment to testnet:
- Deploy CIS2-Bridgeable wasm module
- Deploy Bridge-Manager wasm module
- Initializes Bridge-Manager contract
- Grants `Manager` role on Bridge-Manager for manager address configured above.
- For each token supported on testnet:
- Initializes CIS-Bridgeable contract for that token
- Grants Bridge-Manager contract `manager` role on the contract
