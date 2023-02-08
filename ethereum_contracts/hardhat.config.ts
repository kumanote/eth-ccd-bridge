import { config } from "dotenv";
config({
    path: '.env'
})

import { HardhatUserConfig } from "hardhat/types";

import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import '@nomiclabs/hardhat-ethers'
import "@typechain/hardhat";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-web3";

const ACCOUNT_PRIVATE_KEY = process.env.ACCOUNT_PRIVATE_KEY || "";
const ETHEREUM_GOERLI_KEY = process.env.ETHEREUM_GOERLI_KEY || "";
const ETHEREUM_MAINNET_KEY = process.env.ETHEREUM_MAINNET_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";
const POLYGON_API_KEY = process.env.POLYGON_API_KEY || "";
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || "";
const COINMARKETCAP_KEY = process.env.COINMARKETCAP_KEY || "";

const hardhatConfig: HardhatUserConfig = {
    defaultNetwork: "hardhat",
    solidity: {
        compilers: [
            {
                version: "0.8.16",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            }
        ]
    },
    networks: {
        hardhat: {},
        goerli: {
            url: `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_KEY}`,
            accounts: [ETHEREUM_GOERLI_KEY],
        },

        // mainnet: {
        //     url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
        //     gasPrice: 30000000000,
        //     accounts: [ETHEREUM_MAINNET_KEY],
        // },
    },
    etherscan: {
        apiKey: {
            // For all ethereum networks
            mainnet: ETHERSCAN_API_KEY,
            goerli: ETHERSCAN_API_KEY,
            // For all binance smart chain networks
            bsc: BSCSCAN_API_KEY,
            bscTestnet: BSCSCAN_API_KEY,
            // For all polygon networks
            polygon: POLYGON_API_KEY,
            polygonMumbai: POLYGON_API_KEY,
        }
    },
    gasReporter: {
        currency: 'USDT',
        coinmarketcap: COINMARKETCAP_KEY,
    },
};

export default hardhatConfig;
