import { useCallback } from "react";
import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
import useCCDWalletStore from "src/store/ccd-wallet/ccdWalletStore";
import network from "@config/network";

// local storage wording:
// Cornucopia_${chainName}_state

const useCCDWallet = () => {
    const ccdContext = useCCDWalletStore((state) => state.ccdContext);
    const setCCDWallet = useCCDWalletStore((state) => state.setCCDWallet);
    const deleteCCDWallet = useCCDWalletStore((state) => state.deleteCCDWallet);

    const connectCCD = useCallback(async () => {
        detectConcordiumProvider()
            .then((provider) => provider.connect())
            .then((accAddress) => {
                if (accAddress) {
                    setCCDWallet(accAddress);
                }
            })
            .then(() => {
                detectConcordiumProvider()
                    // Check if the user is connected to testnet by checking if the testnet genesisBlock exists.
                    // Throw a warning and disconnect if not. We only want to
                    // allow users to interact with our testnet smart contracts.
                    .then((provider) =>
                        provider
                            .getJsonRpcClient()
                            .getCryptographicParameters(network.ccd.genesisHash)
                            .then((result) => {
                                if (result === undefined || result?.value === null) {
                                    deleteCCDWallet();
                                    console.error(
                                        "Your JsonRpcClient in the Concordium browser wallet cannot connect. Check if your Concordium browser wallet is connected to testnet!"
                                    );
                                }
                            })
                    );
            })
            .catch(() => {
                console.error(
                    "Your JsonRpcClient in the Concordium browser wallet cannot connect. Check if your Concordium browser wallet is connected to testnet!"
                );
                deleteCCDWallet();
            });

        localStorage["CCP_CCD_connected"] = true;
    }, [deleteCCDWallet, setCCDWallet]);

    const disconnectCCD = async () => {
        deleteCCDWallet();
        delete localStorage["CCP_CCD_connected"];
    };

    return {
        ccdContext,
        connectCCD,
        disconnectCCD,
    };
};

export default useCCDWallet;
