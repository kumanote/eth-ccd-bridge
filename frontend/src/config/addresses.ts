const addresses = {
    /**
     * Genesis Address
     */
    genesis: "0x0000000000000000000000000000000000000000",

    /**
     * wETH Address
     */
    weth: process.env.NEXT_PUBLIC_WETH_TOKEN_ADDRESS || "",

    /**
     * ETH Address
     */
    eth: "__ETH__",

    /**
     * Root Manager Address
     */
    root: process.env.NEXT_PUBLIC_ROOT_MANAGER_ADDRESS || "",

    /**
     * Bridge Manager Index
     */
    bridgeManagerIndex: process.env.NEXT_PUBLIC_BRIDGE_MANAGER_INDEX,
};

export default addresses;
