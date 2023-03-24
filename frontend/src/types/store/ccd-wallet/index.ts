interface CCDWalletState {
    account: string | undefined;
    isActive: boolean;
    networkMatch: boolean;
}

interface CCDWalletActions {
    setCCDWallet: (ccdWallet: string) => void;
    setCCDNetworkMatch: () => void;
    deleteCCDWallet: (incorrectNetwork?: boolean) => void;
}

export type CCDWalletStore = CCDWalletState & CCDWalletActions;
