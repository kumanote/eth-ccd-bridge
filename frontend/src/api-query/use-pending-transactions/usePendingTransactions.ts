import { useQuery, UseQueryResult } from "react-query";
import { CacheKeys } from "src/constants/CacheKeys";
import isDeposit from "src/helpers/checkTransaction";
import { Components, Paths } from "../../api-query/__generated__/AxiosClient";
import useAxiosClient from "../../store/axios-client";

interface Params extends Paths.WalletTxs.PathParameters {}

const usePendingTransactions = (
    params: Params,
    options?: any
): UseQueryResult<Components.Schemas.WalletWithdrawTx[], unknown> => {
    const { getClient } = useAxiosClient();
    // pending transactions will always be withdraws because it's a 2-step process
    return useQuery(
        [CacheKeys.Wallet, params],
        async () => {
            const client = await getClient();
            if (!client) throw new Error("Client not initialized.");
            const { data } = await client?.wallet_txs(params);

            // filter the pending withdraws
            const pending = data.filter((transaction) => {
                if (!isDeposit(transaction)) {
                    return transaction.Withdraw.status === "pending";
                }
            });

            // map the withdraws so the function does not return in the transaction.Withdraw form
            // and sort them by timestamp (older transactions should be verified first)

            return pending.map((transaction) => {
                if (!isDeposit(transaction)) {
                    return transaction.Withdraw;
                }
            });
        },
        { ...options }
    );
};

export default usePendingTransactions;
