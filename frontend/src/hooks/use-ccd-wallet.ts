import { useCallback, useEffect } from "react";
import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
import useCCDWalletStore from "src/store/ccd-wallet/ccdWalletStore";
import network from "@config/network";

/**
 * Returns undefined if API not available
 */
const isNetworkMatchNew = async () => {
    const provider = await detectConcordiumProvider();

    // TODO: remove any cast when concordium browser wallet version 1 has been released.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((provider as any).getSelectedChain === undefined) {
        return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedChain = await (provider as any).getSelectedChain();
    return selectedChain === network.ccd.genesisHash;
};

const isNetworkMatchOld = async () => {
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
};

// local storage wording:
// Cornucopia_${chainName}_state

const useCCDWallet = () => {
    const ccdContext = useCCDWalletStore((state) => ({
        account: state.account,
        isActive: state.isActive,
    }));
    const { deleteWallet, setWallet } = useCCDWalletStore();

    const matchesExpectedNetwork = useCallback(async () => {
        return (await isNetworkMatchNew()) ?? (await isNetworkMatchOld());
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

        const networkMatch = await matchesExpectedNetwork();
        if (networkMatch) {
            refreshMostRecentlySelectedAccount();
        } else {
            deleteWallet();
        }
    }, [ccdContext.isActive, refreshMostRecentlySelectedAccount, matchesExpectedNetwork, deleteWallet]);

    /**
     * Throws if API not available
     */
    const connectCCD = useCallback(async () => {
        const provider = await detectConcordiumProvider();

        const networkMatch = await isNetworkMatchNew();
        if (networkMatch === false) {
            // New API found, wrong network in wallet
            throw new Error("Wrong network in concordium wallet");
        }

        let account: string | undefined;
        try {
            account = await provider.connect();
        } catch {
            // Connection request rejected in wallet
            deleteWallet();
            return;
        }

        // New API not found, use fallback network match
        if (networkMatch === undefined && !(await isNetworkMatchOld())) {
            throw new Error("Genesis block for expected network not found");
        }

        if (account) {
            setWallet(account);
        }
    }, [deleteWallet, setWallet]);

    useEffect(() => {
        detectConcordiumProvider().then(init);
    }, [init]);

    return {
        ccdContext,
        /**
         * Throws if API not available
         */
        connectCCD,
        disconnectCCD: deleteWallet,
        refreshMostRecentlySelectedAccount,
    };
};

export default useCCDWallet;
