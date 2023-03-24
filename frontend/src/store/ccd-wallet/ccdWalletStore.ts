import { CCDWalletStore } from "src/types/store/ccd-wallet";
import create from "zustand";

const useCCDWalletStore = create<CCDWalletStore>((set, get) => ({
    account: undefined,
    isActive: false,
    networkMatch: true,
    setCCDWallet: (address: string) => {
        set({ account: address, isActive: true });
        localStorage["CCP_CCD_connected"] = true;
    },
    setCCDNetworkMatch: () => {
        set({ networkMatch: true });
    },
    deleteCCDWallet: (incorrectNetwork?: boolean) => {
        set({
            account: undefined,
            isActive: false,
            networkMatch: incorrectNetwork !== undefined ? !incorrectNetwork : get().networkMatch,
        });
        delete localStorage["CCP_CCD_connected"];
    },
}));

export default useCCDWalletStore;
