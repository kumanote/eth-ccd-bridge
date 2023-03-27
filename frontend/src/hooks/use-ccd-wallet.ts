import { useCallback, useEffect } from "react";
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
    const { deleteWallet, setWallet, setNetworkMatch } = useCCDWalletStore();

    const matchesExpectedNetwork = useCallback(async () => {
        const provider = await detectConcordiumProvider();

        // TODO: remove any cast when concordium browser wallet version 1 has been released.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((provider as any).getSelectedChain !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (provider as any).getSelectedChain() === network.ccd.genesisHash;
        }

        // TODO: wallet API for browser wallet v1.0 will have an entry point `getSelectedChain`, which does this.
        // When this version of the browser wallet is released, the remainder of this function can be safely removed.
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

    const refreshMostRecentlySelectedAccount = useCallback(async () => {
        const provider = await detectConcordiumProvider();
        const account = await provider.getMostRecentlySelectedAccount();

        if (account) {
            setWallet(account);
        }
    }, [setWallet]);

    const init = useCallback(async () => {
        if (ccdContext.isActive) {
            return;
        }

        refreshMostRecentlySelectedAccount();

        const networkMatch = await matchesExpectedNetwork();
        if (networkMatch) {
            setNetworkMatch();
        } else {
            deleteWallet(true);
        }
    }, [
        ccdContext.isActive,
        refreshMostRecentlySelectedAccount,
        matchesExpectedNetwork,
        setNetworkMatch,
        deleteWallet,
    ]);

    const connectCCD = useCallback(async () => {
        const provider = await detectConcordiumProvider();

        try {
            const account = await provider.connect();
            if (account) {
                setWallet(account);
            }
        } catch {
            deleteWallet();
        }
    }, [deleteWallet, setWallet]);

    useEffect(() => {
        detectConcordiumProvider().then(init);
    }, [init]);

    return {
        ccdContext,
        connectCCD,
        disconnectCCD: deleteWallet,
        refreshMostRecentlySelectedAccount,
    };
};

export default useCCDWallet;
