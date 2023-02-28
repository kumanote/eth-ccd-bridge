import { useQuery, UseQueryOptions } from "react-query";
import { CacheKeys } from "src/constants/CacheKeys";
import { Components, Paths } from "./__generated__/AxiosClient";
import useAxiosClient from "../store/axios-client";
import useEthWallet from "@hooks/use-eth-wallet";
import isDeposit from "src/helpers/checkTransaction";
import { isDefined } from "src/helpers/basic";

/**
 * Interval in ms for querying merkle proof
 */
const MERKLE_UPDATE_INTERVAL = 60000;
/**
 * Interval in ms for querying transaction history
 */
const HISTORY_UPDATE_INTERVAL = 10000;

type WatchWithdrawParams = Paths.WatchWithdrawTx.PathParameters;
type WatchWithdrawOptions = UseQueryOptions<
    Components.Schemas.WatchWithdrawalResponse,
    unknown,
    Components.Schemas.WatchWithdrawalResponse,
    (string | WatchWithdrawParams | undefined)[]
>;

export const useWatchWithdraw = (params?: WatchWithdrawParams, options?: WatchWithdrawOptions) => {
    const { getClient } = useAxiosClient();

    return useQuery(
        [CacheKeys.Withdraw, params],
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

type WatchDepositParams = Paths.WatchDepositTx.PathParameters;
type WatchDepositOptions = UseQueryOptions<
    Components.Schemas.WatchTxResponse,
    unknown,
    Components.Schemas.WatchTxResponse,
    (string | WatchDepositParams | undefined)[]
>;

export const useWatchDeposit = (params?: WatchDepositParams, options?: WatchDepositOptions) => {
    const { getClient } = useAxiosClient();

    return useQuery(
        [CacheKeys.Deposit, params],
        async () => {
            const client = await getClient();
            if (!client) throw new Error("Client not initialized.");
            const { data } = await client?.watch_deposit_tx(params);
            return data;
        },
        {
            ...options,
            refetchInterval: (data, query) => {
                if (data?.concordium_tx_hash !== undefined) {
                    return false;
                }

                return typeof options?.refetchInterval === "function"
                    ? options?.refetchInterval(data, query)
                    : options?.refetchInterval ?? false;
            },
        }
    );
};

export const useWalletTransactions = () => {
    const { context } = useEthWallet();
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
        { refetchInterval: HISTORY_UPDATE_INTERVAL }
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

export const useTokens = () => {
    const { getClient } = useAxiosClient();

    return useQuery(
        [CacheKeys.Tokens],
        async () => {
            const client = await getClient();
            if (!client) throw new Error("Client not initialized.");
            const { data } = await client?.list_tokens();
            return data;
        },
        { refetchOnWindowFocus: false }
    );
};

type MerkleProofParams = Paths.EthMerkleProof.PathParameters;

export const useEthMerkleProof = (params: Partial<MerkleProofParams>, enabled = true) => {
    const { getClient } = useAxiosClient();

    return useQuery(
        [CacheKeys.EthMerkleProof, params],
        async () => {
            const client = await getClient();

            if (!client) throw new Error("Client not initialized.");
            if (params.event_id === undefined || params.tx_hash === undefined)
                throw new Error("Should not be enabled with partial params");

            const { data } = await client?.eth_merkle_proof(params as MerkleProofParams);
            return data;
        },
        {
            enabled:
                params.tx_hash !== undefined && params.event_id !== undefined && params.event_id !== null && enabled,
            refetchInterval: (data) => {
                if (data?.proof !== undefined) {
                    return false;
                }
                return MERKLE_UPDATE_INTERVAL;
            },
        }
    );
};
