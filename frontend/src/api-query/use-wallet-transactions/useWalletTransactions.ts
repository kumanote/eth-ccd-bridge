import useWallet from "@hooks/use-wallet";
import { useQuery } from "react-query";
import { CacheKeys } from "src/constants/CacheKeys";
import { isDefined } from "src/helpers/basic";
import isDeposit from "src/helpers/checkTransaction";
import useAxiosClient from "../../store/axios-client";

/**
 * Interval in ms for querying transaction history
 */
const UPDATE_INTERVAL = 10000;

const useWalletTransactions = () => {
    const { context } = useWallet();
    const { getClient } = useAxiosClient();

    const wallet = context?.account;

    return useQuery(
        [CacheKeys.Wallet, context?.account ?? ""],
        async () => {
            const client = await getClient();
            if (!client) throw new Error("Client not initialized.");

            if (!wallet) {
                return undefined;
            }
            const { data } = await client?.wallet_txs({ wallet });
            return data;
        },
        { refetchInterval: UPDATE_INTERVAL }
    );
};

export const usePendingWithdrawals = () => {
    const result = useWalletTransactions();

    const data = result.data
        ?.map((tx) => {
            if (isDeposit(tx) || tx.Withdraw.status !== "pending") {
                return undefined;
            }

            return tx.Withdraw;
        })
        .filter(isDefined);

    return { ...result, data };
};

export default useWalletTransactions;
