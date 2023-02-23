import type { NextPage } from "next";
import TransferOverview from "@components/templates/transfer-overview";
import { useRef } from "react";
import useCCDWallet from "@hooks/use-ccd-wallet";
import useCCDContract from "src/contracts/use-ccd-contract";
import { routes } from "src/constants/routes";
import { Components } from "src/api-query/__generated__/AxiosClient";
import useWallet from "@hooks/use-wallet";

const WithdrawOverview: NextPage = () => {
    const hasApproval = useRef(false);
    const { ccdContext } = useCCDWallet();
    const { context } = useWallet();

    const {
        withdraw: ccdWithdraw,
        approve: ccdApprove,
        hasApprove,
        estimateApprove,
        transactionFinalization,
    } = useCCDContract(ccdContext.account, !!ccdContext.account);

    const requestWithdrawApproval = async (
        token: Components.Schemas.TokenMapItem,
        setStatus: (message: string) => void
    ) => {
        try {
            const approvalFee = await estimateApprove(token);

            setStatus("Awaiting allowance approval in Concordium wallet");
            const { hash } = await ccdApprove(token, approvalFee);

            setStatus("Waiting for transaction to finalize");
            return await transactionFinalization(hash);
        } catch {
            // Either the allowance approval was rejected, or a timeout happened while polling for allowance approval finalization
            return false;
        }
    };

    /**
     * Handles submission of the withdraw transaction.
     */
    const onSubmit = async (
        token: Components.Schemas.TokenMapItem,
        amount: string,
        setError: (message: string) => void,
        setStatus: (message: string) => void
    ): Promise<string | undefined> => {
        if (!context) {
            throw new Error("Could not find Ethereum wallet");
        }

        if (!hasApproval.current) {
            hasApproval.current =
                (await hasApprove({
                    index: token.ccd_contract?.index,
                    subindex: token.ccd_contract?.subindex,
                })) || (await requestWithdrawApproval(token, setStatus));
        }

        if (!hasApproval.current) {
            setError("Approval for withdraw not available");
            return;
        }

        let hash: string | undefined;
        try {
            setStatus("Awaiting signature of withdrawal in Concordium wallet");
            const tx = await ccdWithdraw(amount, token, context?.account || "");
            hash = tx.hash;
        } catch {
            setError("Transaction was rejected.");
        }

        if (hash === undefined) {
            return;
        }
        try {
            setStatus("Waiting for transaction to finalize");
            await transactionFinalization(hash); // Wait for transaction finalization, as we do in the deposit flow.

            sessionStorage["CCDSameSession"] = true; // TODO: why is this needed??
            return routes.withdraw.tx.path(hash);
        } catch {
            setError("Could not get transaction status for withdrawal");
        }
    };

    return <TransferOverview handleSubmit={onSubmit} isWithdraw />;
};

export default WithdrawOverview;
