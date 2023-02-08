# Deploy script

There is the `deploy_all.ts` script which will deploy all the contracts and do the necessary configurations.

If any contracts are already deployed they can be provided via environment variables (see `.env.sample`). In this case, no new contract will be deployed, only configuration. _Please Note_ that the proxy address of the contracts needs to be provided, not the implementation address

Sample script command:

`npx hardhat run --network goerli ./scripts/deploy_all.ts`

# Deploy Flow

This section details about the steps in the deploy flow

1. Deploy a ProxyAdmin. This is the contract that has permissions to upgrade contracts

2. Deploy the implementation of RootChainManager, Erc20Vault, EthVault, StateSender

3. Deploy the upgradable proxies for the above contracts and initialize them. The constructor of a proxy are the following impelementation address, proxy admin address, payload for the initialize function on the implementation contract. Currently this is the account which will receive the DEFAULT_ADMIN_ROLE (the wallet that is running the script). Sample code for deploying a proxy:

`await StateSenderFactoryProxy.deploy( stateSender.address, proxyAdmin.address, stateSender.interface.encodeFunctionData('initialize', [owner.address]) )`

4. Configure the root chain manager

- `setStateSender` is called to set the `StateSender`
- `registerVault` is called to register `EtherVault` and `Erc20Vault`

5. Role permissions are set:

- `StateSender` must grant `EMITTER_ROLE` to `RootChainManager`
- `Erc20Vault` and `EtherVault` must grant `MANAGER_ROLE` to `RootChainManager`
