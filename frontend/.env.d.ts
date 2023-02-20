declare global {
    namespace NodeJS {
        interface ProcessEnv {
            // Ethereum contract addresses
            // NEXT_PUBLIC_WETH: string; // TODO: Doesn't seem like this is used? Can this be removed?
            /**
             * Address of the bridge root manager contract on Ethereum.
             */
            NEXT_PUBLIC_ROOT_MANAGER_ADDRESS: string;
            NEXT_PUBLIC_GENERATE_ETHER_PREDICATE_ADDRESS: string; // TODO: What's this? Add documentation
            NEXT_PUBLIC_GENERATE_ERC20_PREDICATE_ADDRESS: string; // TODO: Add documentation
            // NEXT_PUBLIC_STATE_SENDER_ADDRESS: string; // TODO: Doesn't seem like this is used? Can this be removed?
            // NEXT_PUBLIC_PROXY_ADMIN_ADDRESS: string; // TODO: Doesn't seem like this is used? Can this be removed?


            // Ethereum token contract addresses
            /**
             * Address of the ETH ethereum contract
             */
            NEXT_PUBLIC_ETH_TOKEN_ADDRESS: string;
            /**
             * Address of the wETH ethereum contract
             */
            NEXT_PUBLIC_WETH_TOKEN_ADDRESS: string;

            // Providers
            /**
             * The ethereum network ID
             */
            NEXT_PUBLIC_ETHEREUM_PROVIDER_NETWORK: string; // TODO: What's this? Document...
            // NEXT_PUBLIC_ETHEREUM_PROVIDER_KEY: string; // TODO: What's this? Document...
            // NEXT_PUBLIC_INFURA_PROJECT_ID: string; // TODO: What's this? Document...

            /**
             * Block hash of genesis block of the network.
             * Is used to check that the user has its browser wallet connected to the correct network.
             */
            NEXT_PUBLIC_NETWORK_GENESIS_BLOCK_HASH: string; // TODO: Remove this and hardcode instead.

            // Concordium contract addresses
            /**
             * Bridge manager contract index. For now, the accompanying subindex is assumed to be 0. 
             */
            NEXT_PUBLIC_BRIDGE_MANAGER_INDEX: number; // TODO: Don't assume the subindex is 0, as sometime it might not be...

            /**
             * URL of the bridge API.
             */
            NEXT_PUBLIC_API_URL: string;
            /**
             * URL of ccdscan for concordium network.
             */
            NEXT_PUBLIC_CCDSCAN_URL: string;

            // CCD contract schemas
            /**
             * Hex encoded schema of the bridge manager contract.
             */
            NEXT_PUBLIC_BRIDGE_MANAGER: string;
            /**
             * Hex encoded schema of the cis2-bridgeable contract.
             */
            NEXT_PUBLIC_CIS2_BRIDGEABLE: string;
        }
    }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
