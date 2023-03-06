import type { NextPage } from "next";
import TransferOverview, {
    TransferOverviewLine,
    useTransferOverviewStatusState,
} from "@components/templates/transfer-overview";
import { FC, useEffect, useMemo, useState } from "react";
import useCCDWallet from "@hooks/use-ccd-wallet";
import useCCDContract from "src/contracts/use-ccd-contract";
import { routes } from "src/constants/routes";
import useEthWallet from "@hooks/use-eth-wallet";
import { useRouter } from "next/router";
import { useNextMerkleRoot } from "src/api-query/queries";
import moment from "moment";
import { useTransactionFlowStore } from "src/store/transaction-flow";
import { Components } from "src/api-query/__generated__/AxiosClient";
import { noOp } from "src/helpers/basic";
import { useAsyncMemo } from "@hooks/utils";
import { getPrice } from "src/helpers/price-usd";
import { toFraction } from "wallet-common-helpers/lib/utils/numberStringHelpers";
import { getEnergyToMicroCcdRate } from "src/helpers/ccd-node";

const LINE_DETAILS_FALLBACK = "...";
const microCcdToCcd = toFraction(1000000n);

const renderFeeEstimate = (microCcdFee: bigint, ccdPrice: number): string => {
    const ccdFee = Number(microCcdToCcd(microCcdFee));
    return `~${ccdFee.toFixed(4)} CCD (${(ccdFee * ccdPrice).toFixed(4)} USD)`;
};

type ApprovaAllowanceLineProps = {
    hasAllowance: boolean;
    token: Components.Schemas.TokenMapItem;
    ccdPrice: number;
    microCcdPerEnergy: bigint | undefined;
};

const ApprovaAllowanceLine: FC<ApprovaAllowanceLineProps> = ({ hasAllowance, token, ccdPrice, microCcdPerEnergy }) => {
    const { ccdContext } = useCCDWallet();
    const { estimateApprove } = useCCDContract(ccdContext.account, !!ccdContext.account);
    const [error, setError] = useState<string>();
    const microCcdFee = useAsyncMemo(
        async () => {
            if (microCcdPerEnergy === undefined) {
                return undefined;
            }

            const energy = await estimateApprove(token);
            if (energy === undefined) {
                return undefined;
            }

            return microCcdPerEnergy * energy.exact;
        },
        () => setError("Could not get fee estimate"),
        [token, microCcdPerEnergy]
    );

    const details = useMemo(
        () => (microCcdFee !== undefined ? renderFeeEstimate(microCcdFee, ccdPrice) : error || LINE_DETAILS_FALLBACK),
        [microCcdFee, ccdPrice, error]
    );

    return <TransferOverviewLine title="Approve allowance:" details={details} completed={hasAllowance} />;
};

/** Cost of withdraw of 1 token unit. This is only used until an allowance has been approved */
const CIS2_BRIDGEABLE_WITHDRAW_ENERGY_FALLBACK = 4905n;

type WithdrawLineProps = {
    hasAllowance: boolean;
    token: Components.Schemas.TokenMapItem;
    amount: bigint;
    ethAccount: string;
    ccdPrice: number;
    microCcdPerEnergy: bigint | undefined;
};

const WithdrawLine: FC<WithdrawLineProps> = ({
    token,
    amount,
    ethAccount,
    ccdPrice,
    microCcdPerEnergy,
    hasAllowance,
}) => {
    const { ccdContext } = useCCDWallet();
    const { estimateWithdraw } = useCCDContract(ccdContext.account, !!ccdContext.account);
    const [error, setError] = useState<string>();
    const microCcdFee = useAsyncMemo(
        async () => {
            if (microCcdPerEnergy === undefined) {
                return undefined;
            }

            let energy: bigint;
            try {
                const estimate = await estimateWithdraw(amount, token, ethAccount);
                energy = estimate?.exact ?? CIS2_BRIDGEABLE_WITHDRAW_ENERGY_FALLBACK;
            } catch {
                energy = CIS2_BRIDGEABLE_WITHDRAW_ENERGY_FALLBACK;
            }

            return microCcdPerEnergy * energy;
        },
        () => setError("Could not get fee estimate"),
        [token, microCcdPerEnergy, hasAllowance]
    );

    const details = useMemo(
        () => (microCcdFee !== undefined ? renderFeeEstimate(microCcdFee, ccdPrice) : error || LINE_DETAILS_FALLBACK),
        [microCcdFee, ccdPrice, error]
    );

    return <TransferOverviewLine title="Approve allowance:" details={details} />;
};

const WithdrawOverview: NextPage = () => {
    const { ccdContext } = useCCDWallet();
    const { context } = useEthWallet();
    const { prefetch, replace } = useRouter();
    const { data, isLoading } = useNextMerkleRoot();
    const { amount, token } = useTransactionFlowStore();
    const { status, setInfo, setError } = useTransferOverviewStatusState();
    const [needsAllowance, setNeedsAllowance] = useState<boolean | undefined>();
    const ccdPrice = useAsyncMemo(async () => getPrice("CCD"), noOp, []) ?? 0;
    const microCcdPerEnergy = useAsyncMemo(getEnergyToMicroCcdRate, noOp, []);

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
        if (!amount || !token || !context.account) {
            replace(routes.withdraw.path);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    //
    // Check necessary values are present from transfer page. These will not be available if this is the first page loaded in the browser.
    if (!amount || !token || !context.account) {
        return null;
    }

    const requestWithdrawApproval = async () => {
        try {
            const approvalFee = await estimateApprove(token);

            setInfo("Awaiting allowance approval in Concordium wallet");
            const hash = await ccdApprove(token, approvalFee?.conservative);

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
            hash = await ccdWithdraw(amount, token, context?.account || "", withdrawFee?.conservative);
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
            <ApprovaAllowanceLine
                hasAllowance={needsAllowance === false}
                token={token}
                ccdPrice={ccdPrice}
                microCcdPerEnergy={microCcdPerEnergy}
            />
            <br />
            <WithdrawLine
                hasAllowance={needsAllowance === false}
                token={token}
                ccdPrice={ccdPrice}
                microCcdPerEnergy={microCcdPerEnergy}
                ethAccount={context.account}
                amount={amount}
            />
            <br />
            <TransferOverviewLine
                isEth
                title="Approve withdraw:"
                details="Fee will be visible when signing the transaction."
            />
            <div style={{ marginTop: 12 }} />
        </TransferOverview>
    );
};

export default WithdrawOverview;
