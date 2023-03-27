interface CCDWalletState {
    account: string | undefined;
    isActive: boolean;
    networkMatch: boolean;
}

interface CCDWalletActions {
    setWallet: (ccdWallet: string) => void;
    setNetworkMatch: () => void;
    deleteWallet: (incorrectNetwork?: boolean) => void;
}

export type CCDWalletStore = CCDWalletState & CCDWalletActions;
