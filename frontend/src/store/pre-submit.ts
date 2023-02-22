import { Components } from "src/api-query/__generated__/AxiosClient";
import create from "zustand";

type PreSubmitStore = {
    amount?: string;
    token?: Components.Schemas.TokenMapItem;
    setAmount(amount: string): void;
    setToken(token: Components.Schemas.TokenMapItem): void;
    clear(): void;
};

export const usePreSubmitStore = create<PreSubmitStore>((set) => ({
    setAmount: (amount) => set({ amount }),
    setToken: (token) => set({ token }),
    clear: () => set({ amount: undefined, token: undefined }),
}));
