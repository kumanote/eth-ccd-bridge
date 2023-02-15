# ETH-CCD bridge frontend

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Dependencies

- NodeJS stable v18.12 (easiest to manage this through [NVM](https://github.com/nvm-sh/nvm))
- [Yarn classic stable](https://classic.yarnpkg.com/en/docs/install)
  - If using NVM to manage node versions, it might be best to NOT use node to install yarn but instead go with an alternative solution.

## Installation

```bash
yarn
```

## Running

First, run the nextjs development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) (alternatively, the URL logged in your console) with your browser to see the result.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on `http://localhost:3000/api/*`.
The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

### Runtime configuration

The project depends on a number of configuration options that can be set through environment variables.

- `NEXT_PUBLIC_ROOT_MANAGER_ADDRESS`: Addrees of main contract [RootChainManager](../ethereum_contracts/contracts/root).
- `NEXT_PUBLIC_BRIDGE_MANAGER_INDEX`: Index of the Concordium [bridge manager contract](../concordium_contracts/bridge-manager).
- `NEXT_PUBLIC_WETH_TOKEN_ADDRESS`: Ethereum contract address for wETH token.
- `NEXT_PUBLIC_TESTNET_GENESIS_BLOCK_HASH`: Hex encoded block hash of testnet genesis block.
- `NEXT_PUBLIC_API_URL`: URL of the Concordium bridge API.
- `NEXT_PUBLIC_BRIDGE_MANAGER`: Hex encoded contract schema for Concordium [bridge manager contract](../concordium_contracts/bridge-manager).
- `NEXT_PUBLIC_CIS2_BRIDGEABLE`: Hex encoded contract schema for Concordium [cis2-bridgeable contract](../concordium_contracts/cis2-bridgeable).

## Learn More

To learn more about Next.js, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
