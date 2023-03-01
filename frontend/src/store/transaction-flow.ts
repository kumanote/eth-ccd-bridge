import { Components } from "src/api-query/__generated__/AxiosClient";
import create from "zustand";

type TransactionFlowStore = {
    amount?: string;
    token?: Components.Schemas.TokenMapItem;
    setAmount(amount: string): void;
    setToken(token: Components.Schemas.TokenMapItem): void;
    clear(): void;
};

/**
 * Value store to be used for deposit/withdraw flows.
 */
export const useTransactionFlowStore = create<TransactionFlowStore>((set) => ({
    setAmount: (amount) => set({ amount }),
    setToken: (token) => set({ token }),
    clear: () => set({ amount: undefined, token: undefined }),
}));
