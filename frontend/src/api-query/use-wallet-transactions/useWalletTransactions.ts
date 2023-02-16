import { useQuery } from "react-query";
import { CacheKeys } from "src/constants/CacheKeys";
import { Paths } from "../../api-query/__generated__/AxiosClient";
import useAxiosClient from "../../store/axios-client";

interface Params extends Paths.WalletTxs.PathParameters {}

const useWalletTransactions = (params: Params, options?: any) => {
    const { getClient } = useAxiosClient();

    return useQuery(
        [CacheKeys.Wallet, params],
        async () => {
            const client = await getClient();
            if (!client) throw new Error("Client not initialized.");
            const { data } = await client?.wallet_txs(params);
            return data;
        },
        { ...options, refetchInterval: 5000 }
    );
};

export default useWalletTransactions;
