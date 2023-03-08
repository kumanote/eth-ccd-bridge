import { ensureValue } from "src/helpers/basic";

const eth = ensureValue(
    process.env.NEXT_PUBLIC_ETH_TOKEN_ADDRESS,
    "Expected NEXT_PUBLIC_ETH_TOKEN_ADDRESS to be provided as an environment variable"
);
const root = ensureValue(
    process.env.NEXT_PUBLIC_ROOT_MANAGER_ADDRESS,
    "Expected NEXT_PUBLIC_ROOT_MANAGER_ADDRESS to be provided as an environment variable"
);

const bridgeManagerIndex = ensureValue(
    process.env.NEXT_PUBLIC_BRIDGE_MANAGER_INDEX,
    "Expected NEXT_PUBLIC_BRIDGE_MANAGER_INDEX to be provided as an environment variable"
);

const addresses = {
    /**
     * ETH Address (Ethereum)
     */
    eth,

    /**
     * Root Manager Address (Ethereum)
     */
    root,

    /**
     * Bridge Manager Address (Concordium)
     */
    bridgeManager: {
        index: bridgeManagerIndex,
        subindex: process.env.NEXT_PUBLIC_BRIDGE_MANAGER_SUBINDEX ?? "0",
    },
};

export default addresses;
