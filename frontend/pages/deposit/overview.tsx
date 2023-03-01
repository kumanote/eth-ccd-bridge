import type { NextPage } from "next";
import TransferOverview from "@components/templates/transfer-overview";
import { Components } from "src/api-query/__generated__/AxiosClient";
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

const DepositOverview: NextPage = () => {
    const { amount, token: selectedToken } = useTransactionFlowStore();
    const { checkAllowance, hasAllowance } = useGenerateContract(
        selectedToken?.eth_address as string, // address or empty string because the address is undefined on first renders
        !!selectedToken && !!amount // plus it's disabled on the first render anyway
    );
    const { typeToVault, depositFor, depositEtherFor, estimateGas } = useRootManagerContract();
    const [needsAllowance, setNeedsAllowance] = useState<boolean | undefined>(undefined);
    const { prefetch } = useRouter();
    const erc20PredicateAddress = useAsyncMemo(
        async () => {
            return typeToVault();
        },
        noOp,
        [selectedToken]
    );
    useEffect(() => {
        if (selectedToken?.eth_address === addresses.eth) {
            setNeedsAllowance(false);
        } else if (erc20PredicateAddress) {
            hasAllowance(erc20PredicateAddress).then((allowance) => setNeedsAllowance(!allowance));
        }
    }, [hasAllowance, erc20PredicateAddress, needsAllowance, selectedToken]);

    const getAllowance = async (
        setError: (message: string) => void,
        setStatus: (message: string) => void
    ): Promise<boolean> => {
        if (erc20PredicateAddress === undefined || needsAllowance === undefined) {
            return false;
        }
        if (needsAllowance === false) {
            return true;
        }

        try {
            setStatus("Requesting allowance from Ethereum wallet.");
            const tx = await checkAllowance(erc20PredicateAddress);

            setStatus("Waiting for transaction to finalize");
            await tx.wait(1);

            setNeedsAllowance(false);
            return true;
        } catch {
            setError("Allowance request rejected");
            return false;
        }
    };

    /**
     * Gets the gas fee required to make the deposit.
     * Throws `Error` if user rejected in the ethereum wallet
     */
    const getGasFee = async (): Promise<number | undefined> => {
        if (!amount || !selectedToken) {
            throw new Error("Invalid page context.");
        }

        if (needsAllowance) {
            return undefined;
        }

        try {
            const gas = await estimateGas(amount, selectedToken, "deposit");
            return parseFloat(gas as string);
        } catch (error) {
            // The user did not approve or doesn't have enough tokens and we show the error
            if (error?.reason) {
                throw new Error(error?.reason);
            } else {
                throw error;
            }
        }
    };

    /**
     * Handles submission of the deposit transaction.
     */
    const onSubmit = async (
        token: Components.Schemas.TokenMapItem,
        amount: bigint,
        setError: (message: string) => void,
        setStatus: (message: string) => void
    ): Promise<string | undefined> => {
        try {
            let txPromise: Promise<ContractTransaction>;
            if (token.eth_address === addresses.eth) {
                txPromise = depositEtherFor(amount);
            } else {
                txPromise = depositFor(amount, token); //deposit
            }

            setStatus("Awaiting signature of deposit in Ethereum wallet");
            const tx = await txPromise;
            prefetch(routes.deposit.tx(tx.hash));

            setStatus("Waiting for transaction to finalize");
            await tx.wait(1); // wait for confirmed transaction

            return routes.deposit.tx(tx.hash);
        } catch (error) {
            if (error.message.includes(errors.ACTION_REJECTED)) {
                setError("Transaction was rejected.");
            } else {
                setError(error.message);
            }
        }
    };

    return (
        <TransferOverview
            handleSubmit={onSubmit}
            requestGasFee={getGasFee}
            requestAllowance={getAllowance}
            needsAllowance={needsAllowance}
        />
    );
};

export default DepositOverview;
