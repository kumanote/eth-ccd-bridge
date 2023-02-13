declare global {
    namespace NodeJS {
        interface ProcessEnv {
            //CONTRACT ADDRESSES ETHEREUM
            NEXT_PUBLIC_WETH: string
            NEXT_PUBLIC_ROOT_MANAGER_ADDRESS: string
            NEXT_PUBLIC_GENERATE_ETHER_PREDICATE_ADDRESS: string
            NEXT_PUBLIC_GENERATE_ERC20_PREDICATE_ADDRESS: string
            NEXT_PUBLIC_STATE_SENDER_ADDRESS: string
            NEXT_PUBLIC_PROXY_ADMIN_ADDRESS: string


            // BRIDGE MANAGER CCD ADDRESS 
            NEXT_PUBLIC_BRIDGE_MANAGER_INDEX: number

            //TOKEN CONTRACTS ETHEREUM
            NEXT_PUBLIC_ETH_TOKEN_ADDRESS: string
            NEXT_PUBLIC_WETH_TOKEN_ADDRESS: string

            //PROVIDERS
            NEXT_PUBLIC_ETHEREUM_PROVIDER_NETWORK: string
            NEXT_PUBLIC_ETHEREUM_PROVIDER_KEY: string
            NEXT_PUBLIC_INFURA_PROJECT_ID: string

            //The TESTNET_GENESIS_BLOCK_HASH is used to check that the user has its browser wallet connected to testnet and not to mainnet.
            NEXT_PUBLIC_TESTNET_GENESIS_BLOCK_HASH: string

            //API
            NEXT_PUBLIC_API_URL: string

            //SCHEMAS
            NEXT_PUBLIC_BRIDGE_MANAGER: string
            NEXT_PUBLIC_CIS2_BRIDGEABLE: string
        }
    }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export { }
