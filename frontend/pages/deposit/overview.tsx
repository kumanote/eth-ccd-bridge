import type { NextPage } from "next";
import TransferOverview, {
    TransferOverviewLine,
    useTransferOverviewStatusState,
} from "@components/templates/transfer-overview";
import { ContractTransaction, errors } from "ethers";
import addresses from "@config/addresses";
import useRootManagerContract from "src/contracts/use-root-manager";
import { routes } from "src/constants/routes";
import useGenerateContract from "src/contracts/use-generate-contract";
import { useTransactionFlowStore } from "src/store/transaction-flow";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAsyncMemo } from "@hooks/utils";
import { noOp } from "src/helpers/basic";
import { getPrice } from "src/helpers/price-usd";

const DepositOverview: NextPage = () => {
    const { amount, token } = useTransactionFlowStore();
    const { checkAllowance, hasAllowance } = useGenerateContract(
        token?.eth_address as string, // address or empty string because the address is undefined on first renders
        !!token && !!amount // plus it's disabled on the first render anyway
    );
    const { typeToVault, depositFor, depositEtherFor, estimateGas } = useRootManagerContract();
    const [needsAllowance, setNeedsAllowance] = useState<boolean | undefined>();
    const allowanceLoading = needsAllowance === undefined;
    const { prefetch } = useRouter();
    const { status, setInfo, setError } = useTransferOverviewStatusState();
    const { replace } = useRouter();
    const ethPrice = useAsyncMemo(async () => getPrice("ETH"), noOp, []) ?? 0;
    const erc20PredicateAddress = useAsyncMemo(
        async () => {
            return typeToVault();
        },
        noOp,
        [token]
    );

    useEffect(() => {
        if (token?.eth_address === addresses.eth) {
            setNeedsAllowance(false);
        } else if (erc20PredicateAddress) {
            hasAllowance(erc20PredicateAddress).then((allowance) => setNeedsAllowance(!allowance));
        }
    }, [hasAllowance, erc20PredicateAddress, needsAllowance, token]);

    useEffect(() => {
        if (!amount || !token) {
            replace(routes.deposit.path);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getAllowance = async (): Promise<boolean> => {
        if (erc20PredicateAddress === undefined || !needsAllowance) {
            return false;
        }

        try {
            setInfo("Requesting allowance from Ethereum wallet.");
            const tx = await checkAllowance(erc20PredicateAddress);

            setInfo("Waiting for transaction to finalize");
            await tx.wait(1);

            setNeedsAllowance(false);
            return true;
        } catch {
            // TODO: log actual error
            setError("Allowance request rejected");
            return false;
        }
    };

    /**
     * Gets the gas fee required to make the deposit.
     * Throws `Error` if user rejected in the ethereum wallet
     */
    const gasFee = useAsyncMemo(
        async (): Promise<number | undefined> => {
            if (!amount || !token) {
                return undefined;
            }

            if (needsAllowance || allowanceLoading) {
                return undefined;
            }

            try {
                const gas = await estimateGas(amount, token, "deposit");
                return parseFloat(gas as string);
            } catch (error) {
                // TODO: log actual error
                setError("Could not estimate cost");
            }
        },
        noOp,
        [amount, token, needsAllowance, estimateGas]
    );

    // Check necessary values are present from transfer page. These will not be available if this is the first page loaded in the browser.
    if (!amount || !token) {
        return null;
    }

    /**
     * Handles submission of the deposit transaction.
     */
    const onSubmit = async (): Promise<string | undefined> => {
        if (needsAllowance && !(await getAllowance())) {
            return undefined;
        }

        try {
            setInfo("Awaiting signature of deposit in Ethereum wallet");
            let tx: ContractTransaction;
            if (token.eth_address === addresses.eth) {
                tx = await depositEtherFor(amount);
            } else {
                tx = await depositFor(amount, token); //deposit
            }

            prefetch(routes.deposit.tx(tx.hash));

            setInfo("Waiting for transaction to finalize");
            await tx.wait(1); // wait for confirmed transaction

            return routes.deposit.tx(tx.hash);
        } catch (error) {
            // TODO: log actual error
            if (error.message.includes(errors.ACTION_REJECTED)) {
                setError("Transaction was rejected.");
            } else {
                setError(error.message);
            }
        }
    };

    return (
        <TransferOverview
            title="Deposit overview"
            handleSubmit={onSubmit}
            timeToComplete="Deposit should take up to 5 minutes to complete."
            status={status}
        >
            {/* TODO show some indication that allowance is loading, and disable continue button*/}
            {needsAllowance && (
                <TransferOverviewLine
                    isEth
                    title="Approve allowance"
                    fee={
                        gasFee === undefined
                            ? `${token.eth_name} allowance needed to estimate network fee.`
                            : gasFee !== undefined && `~${gasFee} ETH (${(gasFee * ethPrice).toFixed(4)} USD)`
                    }
                />
            )}
            <TransferOverviewLine
                isEth
                title="Deposit"
                fee={
                    gasFee === undefined
                        ? `${token.eth_name} allowance needed to estimate network fee.`
                        : gasFee !== undefined && `~${gasFee} ETH (${(gasFee * ethPrice).toFixed(4)} USD)`
                }
            />
        </TransferOverview>
    );
};

export default DepositOverview;
