interface CCDWalletState {
    ccdContext: {
        account: string | null;
        isActive: boolean;
    };
}

interface CCDWalletActions {
    setCCDWallet: (ccdWallet: string) => void;
    deleteCCDWallet: () => void;
}

export type CCDWalletStore = CCDWalletState & CCDWalletActions;
