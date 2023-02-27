import { useQuery } from "react-query";
import { CacheKeys } from "src/constants/CacheKeys";
import { Paths } from "../../api-query/__generated__/AxiosClient";
import useAxiosClient from "../../store/axios-client";

/** Interval in ms for querying merkle proof */
const UPDATE_INTERVAL = 60000;

interface Params extends Paths.EthMerkleProof.PathParameters {}

const useEthMerkleProof = (params: Partial<Params>, enabled = true) => {
    const { getClient } = useAxiosClient();

    return useQuery(
        [CacheKeys.EthMerkleProof, params],
        async () => {
            const client = await getClient();

            if (!client) throw new Error("Client not initialized.");
            if (params.event_id === undefined || params.tx_hash === undefined)
                throw new Error("Should not be enabled with partial params");

            const { data } = await client?.eth_merkle_proof(params as Params);
            return data;
        },
        {
            enabled: params.tx_hash !== undefined && params.event_id !== undefined && params.event_id !== null && enabled,
            refetchInterval: (data) => {
                if (data?.proof !== undefined) {
                    return false;
                }
                return UPDATE_INTERVAL;
            },
        }
    );
};

export default useEthMerkleProof;
