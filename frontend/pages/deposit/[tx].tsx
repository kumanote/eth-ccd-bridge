import { NextPage } from "next";
import TransferProgress, { TransferStep } from "@components/templates/transfer-progress";
import useWatchDeposit from "src/api-query/use-watch-deposit/useWatchDeposit";
import { useRouter } from "next/router";
import { QueryRouter } from "src/types/config";
import { routes } from "src/constants/routes";
import { useMemo } from "react";
import { Components } from "src/api-query/__generated__/AxiosClient";

/** Interval in ms for how often to query for deposit status */
const QUERY_INTERVAL = 10000;

const transferStepMap: { [p in Components.Schemas.TransactionStatus]: TransferStep } = {
    missing: TransferStep.Added,
    pending: TransferStep.Pending,
    processed: TransferStep.Processed,
    failed: TransferStep.Failed,
};

type Query = {
    tx: string;
};

const DepositedTransactionStatus: NextPage = () => {
    const {
        query: { tx },
        replace,
    } = useRouter() as QueryRouter<Query>;
    const { data } = useWatchDeposit(tx !== undefined ? { tx_hash: tx } : undefined, {
        enabled: tx !== undefined,
        refetchInterval: QUERY_INTERVAL,
    });
    const transferStatus = useMemo(() => transferStepMap[data?.status ?? "missing"], [data]);

    if (tx === undefined) {
        replace(routes.deposit.path);
        return null;
    }

    return <TransferProgress transferStatus={transferStatus} />;
};

export default DepositedTransactionStatus;
