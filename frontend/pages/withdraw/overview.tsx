import type { NextPage } from "next";
import TransferOverview, {
    TransferOverviewLine,
    useTransferOverviewStatusState,
} from "@components/templates/transfer-overview";
import { useEffect, useMemo, useState } from "react";
import useCCDWallet from "@hooks/use-ccd-wallet";
import useCCDContract from "src/contracts/use-ccd-contract";
import { routes } from "src/constants/routes";
import useEthWallet from "@hooks/use-eth-wallet";
import { useRouter } from "next/router";
import { useNextMerkleRoot } from "src/api-query/queries";
import moment from "moment";
import { useTransactionFlowStore } from "src/store/transaction-flow";

const WithdrawOverview: NextPage = () => {
    const { ccdContext } = useCCDWallet();
    const { context } = useEthWallet();
    const { prefetch, replace } = useRouter();
    const { data, isLoading } = useNextMerkleRoot();
    const { amount, token } = useTransactionFlowStore();
    const { status, setInfo, setError } = useTransferOverviewStatusState();
    const [needsAllowance, setNeedsAllowance] = useState<boolean | undefined>();

    const {
        withdraw: ccdWithdraw,
        approve: ccdApprove,
        hasApprove,
        estimateApprove,
        transactionFinalization,
        estimateWithdraw,
    } = useCCDContract(ccdContext.account, !!ccdContext.account);

    const timeToComplete = useMemo(() => {
        if (!isLoading && !data) {
            return "Could not get an estimated processing time";
        }
        if (data !== undefined) {
            const nextMerkleRootRelativeTime = moment(data * 1000).fromNow();
            return `Withdrawal expected to be ready for approval ${nextMerkleRootRelativeTime}`;
        }

        return "Getting estimated withdrawal processing time";
    }, [data, isLoading]);

    useEffect(() => {
        if (token !== undefined) {
            hasApprove({
                index: token.ccd_contract?.index,
                subindex: token.ccd_contract?.subindex,
            }).then((allowance) => setNeedsAllowance(!allowance));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        if (!amount || !token) {
            replace(routes.withdraw.path);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    //
    // Check necessary values are present from transfer page. These will not be available if this is the first page loaded in the browser.
    if (!amount || !token) {
        return null;
    }

    const requestWithdrawApproval = async () => {
        try {
            const approvalFee = await estimateApprove(token);

            setInfo("Awaiting allowance approval in Concordium wallet");
            const hash = await ccdApprove(token, approvalFee);

            setInfo("Waiting for transaction to finalize");
            const hasApproval = await transactionFinalization(hash);

            setNeedsAllowance(false);
            return hasApproval;
        } catch {
            // Either the allowance approval was rejected, or a timeout happened while polling for allowance approval finalization
            setError("Allowance appproval rejected");
            return false;
        }
    };

    /**
     * Handles submission of the withdraw transaction.
     */
    const onSubmit = async (): Promise<string | undefined> => {
        if (!context) {
            throw new Error("Could not find Ethereum wallet");
        }

        if (needsAllowance && !(await requestWithdrawApproval())) {
            return undefined;
        }

        let hash: string | undefined;
        try {
            const withdrawFee = await estimateWithdraw(amount, token, context.account || "");

            setInfo("Awaiting signature of withdrawal in Concordium wallet");
            hash = await ccdWithdraw(amount, token, context?.account || "", withdrawFee);
            prefetch(routes.withdraw.tx(hash));
        } catch {
            setError("Transaction was rejected.");
        }

        if (hash === undefined) {
            return;
        }
        try {
            setInfo("Waiting for transaction to finalize");
            await transactionFinalization(hash); // Wait for transaction finalization, as we do in the deposit flow.

            return routes.withdraw.tx(hash);
        } catch {
            setError("Could not get transaction status for withdrawal");
        }
    };

    return (
        <TransferOverview
            title="Withdrawal overview"
            handleSubmit={onSubmit}
            timeToComplete={timeToComplete}
            status={status}
        >
            {/* TODO show some indication that allowance is loading, and disable continue button*/}
            {needsAllowance && (
                <TransferOverviewLine
                    title="Approve allowance:"
                    fee="Fee will be visible when signing the transaction."
                />
            )}
            <TransferOverviewLine
                title="Withdraw initialized:"
                fee="Fee will be visible when signing the transaction."
            />
            <TransferOverviewLine
                isEth
                title="Approve withdraw:"
                fee="Fee will be visible when signing the transaction."
            />
            <div style={{ marginTop: 12 }} />
        </TransferOverview>
    );
};

export default WithdrawOverview;
