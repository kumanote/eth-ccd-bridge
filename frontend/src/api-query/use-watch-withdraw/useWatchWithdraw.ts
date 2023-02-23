import { useQuery, UseQueryOptions } from "react-query";
import { CacheKeys } from "src/constants/CacheKeys";
import { Components, Paths } from "../__generated__/AxiosClient";
import useAxiosClient from "../../store/axios-client";

interface Params extends Paths.WatchWithdrawTx.PathParameters {}
type Options = UseQueryOptions<
    Components.Schemas.WatchWithdrawalResponse,
    unknown,
    Components.Schemas.WatchWithdrawalResponse,
    (string | Params | undefined)[]
>;

const useWatchWithdraw = (params?: Params, options?: Options) => {
    const { getClient } = useAxiosClient();

    return useQuery(
        [CacheKeys.Deposit, params],
        async () => {
            const client = await getClient();
            if (!client) throw new Error("Client not initialized.");
            const { data } = await client?.watch_withdraw_tx(params);
            return data;
        },
        {
            ...options,
            refetchInterval: (data, query) => {
                if (data?.concordium_event_id !== undefined) {
                    return false;
                }

                return typeof options?.refetchInterval === "function"
                    ? options?.refetchInterval(data, query)
                    : options?.refetchInterval ?? false;
            },
        }
    );
};

export default useWatchWithdraw;
