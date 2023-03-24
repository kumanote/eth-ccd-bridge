import { useCallback } from "react";
import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
import useCCDWalletStore from "src/store/ccd-wallet/ccdWalletStore";
import network from "@config/network";

// local storage wording:
// Cornucopia_${chainName}_state

const useCCDWallet = () => {
    const ccdContext = useCCDWalletStore((state) => ({
        account: state.account,
        networkMatch: state.networkMatch,
        isActive: state.isActive,
    }));
    const { setCCDNetworkMatch, deleteCCDWallet, setCCDWallet } = useCCDWalletStore();

    const matchesExpectedNetwork = useCallback(async () => {
        const provider = await detectConcordiumProvider();
        const client = provider.getJsonRpcClient();

        try {
            const result = await client.getCryptographicParameters(network.ccd.genesisHash);

            if (result === undefined || result?.value === null) {
                throw new Error("Genesis block not found");
            }

            return true;
        } catch {
            return false;
        }
    }, []);

    const init = useCallback(async () => {
        const provider = await detectConcordiumProvider();
        const account = await provider.getMostRecentlySelectedAccount();
        const networkMatch = await matchesExpectedNetwork();

        if (account) {
            setCCDWallet(account);
        }
        if (networkMatch) {
            setCCDNetworkMatch();
        } else {
            deleteCCDWallet(true);
        }
    }, [matchesExpectedNetwork, deleteCCDWallet, setCCDNetworkMatch, setCCDWallet]);

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
            deleteCCDWallet(true);
        }
    }, [deleteCCDWallet, setCCDWallet]);

    return {
        ccdContext,
        connectCCD,
        init,
        disconnectCCD: deleteCCDWallet,
    };
};

export default useCCDWallet;
