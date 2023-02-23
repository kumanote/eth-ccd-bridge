import { useQuery } from "react-query";
import { CacheKeys } from "src/constants/CacheKeys";
import { Paths } from "../../api-query/__generated__/AxiosClient";
import useAxiosClient from "../../store/axios-client";

/** Interval in ms for querying merkle proof */
const UPDATE_INTERVAL = 60000;

interface Params extends Paths.EthMerkleProof.PathParameters {}

const useEthMerkleProof = (params: Params) => {
    const { getClient } = useAxiosClient();

    return useQuery(
        [CacheKeys.EthMerkleProof, params],
        async () => {
            const client = await getClient();

            if (!client) throw new Error("Client not initialized.");

            const { data } = await client?.eth_merkle_proof(params);
            return data;
        },
        {
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
