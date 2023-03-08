import { ensureValue } from "src/helpers/basic";

const ethNetworkId = ensureValue(
    process.env.NEXT_PUBLIC_ETHEREUM_PROVIDER_NETWORK,
    "Expected NEXT_PUBLIC_ETHEREUM_PROVIDER_NETWORK to be provided as an environment variable"
);
const ccdGenesisHash = ensureValue(
    process.env.NEXT_PUBLIC_NETWORK_GENESIS_BLOCK_HASH,
    "Expected NEXT_PUBLIC_NETWORK_GENESIS_BLOCK_HASH to be provided as an environment variable"
);
const bridgeApi = ensureValue(
    process.env.NEXT_PUBLIC_API_URL,
    "Expected NEXT_PUBLIC_ROOT_MANAGER_ADDRESS to be provided as an environment variable"
);

const network = {
    eth: {
        id: ethNetworkId,
    },
    ccd: {
        genesisHash: ccdGenesisHash,
    },
};

export default network;
