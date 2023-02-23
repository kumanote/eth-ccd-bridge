import { NextPage } from "next";
import TransferProgress from "@components/templates/transfer-progress";
import { useRouter } from "next/router";
import { QueryRouter } from "src/types/config";
import { routes } from "src/constants/routes";
import useWatchWithdraw from "src/api-query/use-watch-withdraw/useWatchWithdraw";

/** Interval in ms for how often to query for deposit status */
const QUERY_INTERVAL = 10000;

type Query = {
    tx: string;
};

const WithdrawTransactionStatus: NextPage = () => {
    const {
        query: { tx },
        replace,
    } = useRouter() as QueryRouter<Query>;
    const { data } = useWatchWithdraw(tx !== undefined ? { tx_hash: tx } : undefined, {
        enabled: tx !== undefined,
        refetchInterval: QUERY_INTERVAL,
    });

    if (tx === undefined) {
        replace(routes.deposit.path);
        return null;
    }

    return <TransferProgress transferStatus={data?.status} />;
};

export default WithdrawTransactionStatus;
