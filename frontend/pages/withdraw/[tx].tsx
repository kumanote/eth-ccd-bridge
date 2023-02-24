import { NextPage } from "next";
import TransferProgress from "@components/templates/transfer-progress";
import { useRouter } from "next/router";
import { QueryRouter } from "src/types/config";
import { routes } from "src/constants/routes";
import useWatchWithdraw from "src/api-query/use-watch-withdraw/useWatchWithdraw";
import { useEffect } from "react";
import useEthMerkleProof from "src/api-query/use-eth-merkle-proof/useEthMerkpleProof";
import useRootManagerContract from "src/contracts/use-root-manager";

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
    const { data: txData } = useWatchWithdraw(tx !== undefined ? { tx_hash: tx } : undefined, {
        enabled: tx !== undefined,
        refetchInterval: QUERY_INTERVAL,
    });
    const { withdraw } = useRootManagerContract();

    const { data: merkleProofData } = useEthMerkleProof({ event_id: txData?.concordium_event_id, tx_hash: tx });

    useEffect(() => {
        if (tx === undefined) {
            replace(routes.deposit.path);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleApprovalRequest = async (
        setError: (message: string) => void,
        setStatus: (message: string | undefined) => void
    ) => {
        if (merkleProofData?.proof === undefined || merkleProofData?.params === undefined)
            throw new Error("Dependencies for withdrawal request not available");

        try {
            setStatus("Waiting for approval in Ethereum wallet");
            const approvalTx = await withdraw(merkleProofData.params, merkleProofData.proof);

            setStatus("Waiting for transaction to be confirmed");
            await approvalTx.wait(1);

            setStatus(undefined);
        } catch {
            setError("Transacion rejected.");
        }
    };

    const canWithdraw = merkleProofData?.proof !== undefined && merkleProofData.params !== undefined;

    return (
        <TransferProgress
            transferStatus={txData?.status}
            canWithdraw={canWithdraw}
            onRequestApproval={handleApprovalRequest}
        />
    );
};

export default WithdrawTransactionStatus;
