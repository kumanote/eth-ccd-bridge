import { NextPage } from "next";

import History from "@components/templates/history";
import { useRouter } from "next/router";
import { QueryRouter } from "src/types/config";
import { BridgeDirection } from "src/constants/routes";

const TransferHistory: NextPage = () => {
    const { query } = useRouter() as QueryRouter<{ direction: BridgeDirection }>;
    return <History depositSelected={query.direction === BridgeDirection.Deposit} />;
};

export default TransferHistory;
