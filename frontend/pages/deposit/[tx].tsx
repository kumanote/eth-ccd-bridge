import { NextPage } from "next";
import TransferProgress from "@components/templates/transfer-progress";
import useWatchDeposit from "src/api-query/use-watch-deposit/useWatchDeposit";
import { useRouter } from "next/router";
import { QueryRouter } from "src/types/config";
import { routes } from "src/constants/routes";
import { useEffect } from "react";

/** Interval in ms for how often to query for deposit status */
const QUERY_INTERVAL = 10000;

type Query = {
    tx: string;
};

const DepositTransactionStatus: NextPage = () => {
    const {
        query: { tx },
        isReady,
        replace,
    } = useRouter() as QueryRouter<Query>;
    const { data } = useWatchDeposit(tx !== undefined ? { tx_hash: tx } : undefined, {
        enabled: tx !== undefined,
        refetchInterval: QUERY_INTERVAL,
    });

    useEffect(() => {
        if (tx === undefined && isReady) {
            replace(routes.deposit.path);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady, tx]);

    return <TransferProgress transferStatus={data?.status} />;
};

export default DepositTransactionStatus;
