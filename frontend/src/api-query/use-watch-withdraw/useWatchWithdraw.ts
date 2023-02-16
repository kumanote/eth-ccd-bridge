import { useQuery } from "react-query";
import { CacheKeys } from "src/constants/CacheKeys";
import { Paths } from "../__generated__/AxiosClient";
import useAxiosClient from "../../store/axios-client";

interface Params extends Paths.WatchWithdrawTx.PathParameters {}

const useWatchWithdraw = (params?: Params, options?: any) => {
    const { getClient } = useAxiosClient();

    return useQuery(
        [CacheKeys.Deposit, params],
        async () => {
            const client = await getClient();
            if (!client) throw new Error("Client not initialized.");
            const { data } = await client?.watch_withdraw_tx(params);
            return data;
        },
        { ...options }
    );
};

export default useWatchWithdraw;
