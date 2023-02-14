import { CCDWalletStore } from "src/types/store/ccd-wallet";
import create from "zustand";

const useCCDWalletStore = create<CCDWalletStore>((set) => ({
    ccdContext: { account: null, isActive: false },
    setCCDWallet: (address: string) => set({ ccdContext: { account: address, isActive: true } }),
    deleteCCDWallet: () => set({ ccdContext: { account: null, isActive: false } }),
}));

export default useCCDWalletStore;
