import { useQuery, UseQueryOptions } from "react-query";
import { CacheKeys } from "src/constants/CacheKeys";
import { Components, Paths } from "./__generated__/AxiosClient";
import useAxiosClient from "../store/axios-client";
import useEthWallet from "@hooks/use-eth-wallet";
import isDeposit from "src/helpers/checkTransaction";
import { isDefined } from "src/helpers/basic";
import useCCDContract from "src/contracts/use-ccd-contract";
import { TokenMetadata } from "src/helpers/token-helpers";

/**
 * Interval in ms for querying merkle proof
 */
const MERKLE_UPDATE_INTERVAL = 60000;
/**
 * Interval in ms for querying in general
 */
const QUERY_UPDATE_INTERVAL = 10000;

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
            const { data } = await client.watch_withdraw_tx(params);
            return data;
        },
        {
            ...options,
            refetchInterval: (data, query) => {
                if (data?.concordium_event_id !== undefined) {
                    return false;
                }

                if (options?.refetchInterval === undefined) {
                    return QUERY_UPDATE_INTERVAL;
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
            const { data } = await client.watch_deposit_tx(params);
            return data;
        },
        {
            ...options,
            refetchInterval: (data, query) => {
                if (data?.concordium_tx_hash !== undefined) {
                    return false;
                }

                if (options?.refetchInterval === undefined) {
                    return QUERY_UPDATE_INTERVAL;
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
            const { data } = await client.wallet_txs({ wallet });
            return data;
        },
        { refetchInterval: QUERY_UPDATE_INTERVAL }
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

export type TokenWithIcon = { token: Components.Schemas.TokenMapItem; iconUrl: string | undefined };
export const useTokens = () => {
    const { getClient } = useAxiosClient();
    const { tokenMetadataFor } = useCCDContract("", true); // Don't need an account for this..

    return useQuery<TokenWithIcon[] | undefined>(
        [CacheKeys.Tokens],
        async () => {
            const client = await getClient();
            if (!client) throw new Error("Client not initialized.");

            const { data: tokens } = await client.list_tokens();
            const tokenPromises = tokens.map(async (token) => {
                if (token.ccd_contract?.index === undefined || token.ccd_contract.subindex === undefined) {
                    throw new Error("Expected token address to be defined");
                }

                let metadata: TokenMetadata | undefined;
                try {
                    metadata = await tokenMetadataFor(
                        BigInt(token.ccd_contract.index),
                        BigInt(token.ccd_contract.subindex)
                    );
                } catch {
                    metadata = undefined;
                }
                const { url: iconUrl } = metadata?.thumbnail ?? metadata?.display ?? metadata?.artifact ?? {};
                return { token, iconUrl };
            });

            return Promise.all(tokenPromises);
        },
        { refetchOnWindowFocus: false, staleTime: Infinity }
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

            const { data } = await client.eth_merkle_proof(params as MerkleProofParams);
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

export const useNextMerkleRoot = () => {
    const { getClient } = useAxiosClient();

    return useQuery(
        [CacheKeys.EthMerkleProof],
        async () => {
            const client = await getClient();

            if (!client) throw new Error("Client not initialized.");
            const { data } = await client.expected_merkle_root_update();
            return data;
        },
        {
            refetchInterval: MERKLE_UPDATE_INTERVAL,
        }
    );
};
