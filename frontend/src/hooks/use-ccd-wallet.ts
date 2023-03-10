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
        const provider = await detectConcordiumProvider();

        try {
            const account = await provider.connect();
            if (account) {
                setCCDWallet(account);
            }
        } catch {
            deleteCCDWallet();
        }

        const client = provider.getJsonRpcClient();

        try {
            const result = await client.getCryptographicParameters(network.ccd.genesisHash);

            if (result === undefined || result?.value === null) {
                throw new Error("Genesis block not found");
            }
        } catch {
            // Wrong network.. We should issue a network request change, but it's currently not possible in the wallet API.
            deleteCCDWallet();
        }
    }, [deleteCCDWallet, setCCDWallet]);

    return {
        ccdContext,
        connectCCD,
        disconnectCCD: deleteCCDWallet,
    };
};

export default useCCDWallet;
