import { BigNumberish } from "ethers";
import { Components } from "src/api-query/__generated__/AxiosClient";
import create, { StateCreator } from "zustand";
import { persist } from "zustand/middleware";

export type SubmittedTransaction = {
    hash: string;
    /** Integer */
    amount: string;
    token: Components.Schemas.TokenMapItem;
    /** In seconds */
    timestamp: number;
};

type SubmittedTransactionsStore = {
    transactions: SubmittedTransaction[];
    add(transactionHash: string, amount: BigNumberish, token: Components.Schemas.TokenMapItem): void;
};

const storeCreator: StateCreator<SubmittedTransactionsStore> = (set, get) => ({
    transactions: [],
    add: (hash, amount, token) =>
        set({
            transactions: [
                ...get().transactions,
                { hash, amount: amount.toString(), token, timestamp: Math.floor(Date.now() / 1000) },
            ],
        }),
});

export const useSubmittedDepositsStore = create(
    persist<SubmittedTransactionsStore>(storeCreator, {
        name: "eth-ccd-bridge.submitted-deposits",
        getStorage: () => window.sessionStorage,
    })
);

export const useSubmittedWithdrawalsStore = create(
    persist<SubmittedTransactionsStore>(storeCreator, {
        name: "eth-ccd-bridge.submitted-withdrawals",
        getStorage: () => window.sessionStorage,
    })
);
