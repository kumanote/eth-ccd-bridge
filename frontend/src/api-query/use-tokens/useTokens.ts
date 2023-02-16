import { useQuery } from "react-query";
import { CacheKeys } from "src/constants/CacheKeys";
import useAxiosClient from "../../store/axios-client";

const useTokens = () => {
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

export default useTokens;
