import { CCDWalletStore } from "src/types/store/ccd-wallet";
import create from "zustand";

const useCCDWalletStore = create<CCDWalletStore>((set) => ({
    ccdContext: { account: null, isActive: false },
    setCCDWallet: (address: string) => {
        set({ ccdContext: { account: address, isActive: true } });
        localStorage["CCP_CCD_connected"] = true;
    },
    deleteCCDWallet: () => {
        set({ ccdContext: { account: null, isActive: false } });
        delete localStorage["CCP_CCD_connected"];
    },
}));

export default useCCDWalletStore;
