import PendingTransactions from "@components/organisms/pending-transactions/PendingTransactions";
import { TransferOverview } from "@components/organisms/transfer-overview/TransferOverview";
import { TransferProgress } from "@components/organisms/transfer-progress/TransferProgress";
import addresses from "@config/addresses";
import useCCDWallet from "@hooks/use-ccd-wallet";
import useMediaQuery from "@hooks/use-media-query";
import { useGetTransactionToken } from "@hooks/use-transaction-token";
import useWallet from "@hooks/use-wallet";
import { ContractTransaction } from "ethers";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import useEthMerkleProof from "src/api-query/use-eth-merkle-proof/useEthMerkpleProof";
import usePendingTransactions from "src/api-query/use-pending-transactions/usePendingTransactions";
import useWatchDeposit from "src/api-query/use-watch-deposit/useWatchDeposit";
import useWatchWithdraw from "src/api-query/use-watch-withdraw/useWatchWithdraw";
import { Components } from "src/api-query/__generated__/AxiosClient";
import depositStatusMap from "src/constants/DepositStatusMap";
import withdrawStatusMap from "src/constants/WithdrawStatusMap";
import useCCDContract from "src/contracts/use-ccd-contract";
import useGenerateContract from "src/contracts/use-generate-contract";
import useRootManagerContract from "src/contracts/use-root-manager";
import parseAmount from "src/helpers/parseAmount";
import Transfer from "../../organisms/transfer/Transfer";

const Cornucopia = () => {
    // hooks
    const router = useRouter();
    const { context } = useWallet();
    const { ccdContext } = useCCDWallet();

    const isTablet = useMediaQuery("(max-width: 1050px)"); // res at which cornucopia logo might touch the modal
    const isMobile = useMediaQuery("(max-width: 540px)"); // res at which the design looks a little weird

    // token state
    const [selectedToken, setSelectedToken] = useState<Components.Schemas.TokenMapItem>();

    // status states
    const [transferStatus, setTransferStatus] = useState("");
    const [transferStep, setTransferStep] = useState(0);
    const [overviewPendingSubmission, setOverviewPendingSubmission] = useState(false);
    const [pendingContinueClicked, setPendingContinueClicked] = useState(false);
    const [isPending, setIsPending] = useState(false);

    // withdraw approve state
    const [withdrawApproved, setWithdrawApproved] = useState(false);
    const [withdrawApproveFee, setWithdrawApproveFee] = useState<number>();

    // withdraw estimate ccd state
    const [estimatedWithdrawEnergy] = useState(0);

    // txs and event id
    const [depositTx, setDepositTx] = useState<string>();
    const [ccdWithdrawTxHash, setCcdWithdrawTxHash] = useState<string>();
    const [ccdApproveTxResult, setCcdApproveTxResult] = useState(false);
    const [ccdApproveTxHash, setCcdApproveTxHash] = useState<string>();
    const [eventId, setEventId] = useState<number | undefined>();

    // amount to transfer
    const [amount, setAmount] = useState("0");

    // any errors except for ccd wallet connect
    const [error, setError] = useState("");

    // eth gas
    const [gasFee, setGasFee] = useState(0);

    // pending transactions states
    const [pendingTransaction, setPendingTransaction] = useState<Components.Schemas.WalletWithdrawTx>();
    const getTransactionToken = useGetTransactionToken();
    const pendingTransactionTokenQuery = useMemo(
        () => (pendingTransaction ? getTransactionToken({ Withdraw: pendingTransaction }) : undefined),
        [pendingTransaction, getTransactionToken]
    );

    // transaction steps
    // TODO: Replace this with proper routing...
    const [step, setStep] = useState<
        "overview-deposit" | "overview-withdraw" | "progress-deposit" | "progress-withdraw" | undefined
    >(undefined);

    // state dependent hooks
    const {
        withdraw: ccdWithdraw,
        getTransactionStatus,
        approve: ccdApprove,
        hasApprove,
        estimateApprove,
    } = useCCDContract(ccdContext.account, !!ccdContext.account);
    const { typeToVault, depositFor, depositEtherFor, withdraw: eth_withdraw, estimateGas } = useRootManagerContract();
    const { checkAllowance } = useGenerateContract(
        selectedToken?.eth_address as string, // address or empty string because the address is undefined on first renders
        !!selectedToken && !!amount // plus it's disabled on the first render anyway
    );
    const { data: depositData } = useWatchDeposit(depositTx !== undefined ? { tx_hash: depositTx } : undefined, {
        enabled: !!depositTx,
        refetchInterval: 1000,
    });
    const { data: watchWithdrawData } = useWatchWithdraw(
        { tx_hash: ccdWithdrawTxHash || "" },
        {
            enabled: !!ccdWithdrawTxHash && !eventId, // if we already have the eventId, stop the query until the merkleProof is ready
            refetchInterval: 1000,
        }
    );
    const { data: merkleProof } = useEthMerkleProof({
        event_id: eventId || 0,
        tx_hash: ccdWithdrawTxHash || "",
    });
    const { data: pendingTransactions } = usePendingTransactions(
        { wallet: context?.account || "" },
        { enabled: !!context.account && !ccdWithdrawTxHash } // stop the query if you have a tx hash, so an ongoing transaction won't come in the pending array
    );

    // handlers
    const historyClickHandler = () => {
        router.push("/transfer-history");
    };
    const selectedTokenHandler = (token: Components.Schemas.TokenMapItem) => {
        setSelectedToken(token);
    };

    const depositHandler = (amount: string) => {
        setError("");
        setStep("overview-deposit");
        setAmount(amount);
    };

    const withdrawHandler = async (amount: string) => {
        setError(""); //clear any remaining errors

        //check if the user already has approve before going on the overview screen
        //then we set the withdrawApproved state
        //that state determines if the user can withdraw for now
        //if he can't then we show the energy cost for approving the withdraw
        const approved = await hasApprove({
            index: selectedToken?.ccd_contract?.index,
            subindex: selectedToken?.ccd_contract?.subindex,
        });

        setWithdrawApproved(!!approved);

        if (!approved) {
            const estimatedApprove = await estimateApprove(selectedToken);
            setWithdrawApproveFee(estimatedApprove);
        }

        setStep("overview-withdraw");
        setAmount(amount);
    };

    const overviewContinueHandler = async () => {
        if (!selectedToken) {
            throw new Error("Expected selected token to be available");
        }

        setOverviewPendingSubmission(true);

        if (step?.includes("withdraw")) {
            try {
                //if already approved
                if (withdrawApproved) {
                    //withdraw
                    const ccdWithdrawTx = await ccdWithdraw(amount, selectedToken, context?.account || "");
                    if (ccdWithdrawTx?.hash) {
                        setStep("progress-withdraw");
                        setCcdWithdrawTxHash(ccdWithdrawTx.hash);
                        sessionStorage["CCDSameSession"] = true;
                    }
                } else {
                    //else approve and set the result and hash
                    //those go in a useEffect that checks approve status
                    //after it's done, the withdraw will be tried again
                    const ccdApproveTx = await ccdApprove(selectedToken, withdrawApproveFee);
                    setCcdApproveTxResult(ccdApproveTx?.result);
                    setCcdApproveTxHash(ccdApproveTx?.hash);
                }
            } catch (error: any) {
                if (error.message.includes("Too low energy")) {
                    setError("Not enough CCD to approve spending.");
                }
                console.error(error);
            }
        } else {
            setTransferStatus("Confirming transaction...");
            setTransferStep(1);
            await deposit(amount);
        }

        setOverviewPendingSubmission(false);
    };
    const overviewCancelHandler = () => {
        setError("");
        setStep(undefined);
        setTransferStatus("");
        setTransferStep(0);
    };
    const progressContinueHandler = () => {
        if (step === "progress-withdraw") {
            sessionStorage["CCDCurrentTx"] = ccdWithdrawTxHash;
        }
        if (transferStep === 5) {
            setTransferStatus("");
            setTransferStep(0);
        }
        setStep(undefined);
    };
    const depositCompletedHandler = () => {
        setTransferStatus("");
        setTransferStep(0);
        setStep(undefined);
    };

    // functions/helpers

    const ccdSdkWithdraw = async () => {
        if (withdrawApproved && selectedToken) {
            const ccdWithdrawTx = await ccdWithdraw(amount, selectedToken, context?.account || "");
            if (ccdWithdrawTx?.result) {
                setStep("progress-withdraw");
                setCcdWithdrawTxHash(ccdWithdrawTx.hash);
                sessionStorage["CCDSameSession"] = true;
            } else {
                setError("Withdraw failed");
                throw new Error("CCD withdraw failed");
            }
        }
    };

    const deposit = async (amount: string) => {
        try {
            if (selectedToken && ccdContext.account) {
                let tx: ContractTransaction;
                if (selectedToken.eth_address === addresses.eth) {
                    // when depositing ether, we don't need to check allowance
                    tx = await depositEtherFor(amount);
                } else {
                    const erc20PredicateAddress = await typeToVault(); //generate predicate address
                    await checkAllowance(erc20PredicateAddress); //check allowance for that address
                    tx = await depositFor(amount, selectedToken); //deposit
                }

                setStep("progress-deposit"); // track deposit progress
                await tx.wait(1); // wait for confirmed transaction
                setDepositTx(tx.hash); // set the hash to fetch status
            }
        } catch (error: any) {
            console.dir("Deposit error:", error);
            setTransferStatus("");
            setTransferStep(0);
            setDepositTx(undefined);

            if (error.message.includes("ACTION_REJECTED")) {
                setError("Please confirm the transaction!");
            } else {
                setError(error.message);
            }
        }
    };
    const fetchGas = async (type: "deposit" | "withdraw") => {
        if (amount && selectedToken) {
            if (type === "deposit") {
                try {
                    // if the token is ETH, you can estimate without allowance
                    if (selectedToken.eth_address === addresses.eth) {
                        const gas = await estimateGas(amount, selectedToken, "deposit");
                        setGasFee(parseFloat(gas as string));
                    } else {
                        const erc20PredicateAddress = await typeToVault(); //generate predicate address
                        // try to check the allowance of the token (else you can't estimate gas)
                        const tx = await checkAllowance(erc20PredicateAddress);

                        if (tx) {
                            // if the tx is returned, the allowance was approved
                            // wait for the confirmation of approve()
                            // and estimate the gas
                            await tx.wait(1);
                        }

                        // if the tx comes undefined, but no error was thrown
                        // the user already approved token spending
                        // then estimate the gas
                        const gas = await estimateGas(amount, selectedToken, "deposit");
                        setGasFee(parseFloat(gas as string));
                    }
                } catch (error: any) {
                    setGasFee(0);
                    console.error("gas reason:", error);

                    // else, the user did not approve or doesn't have enought tokens and we see the error
                    if (error?.reason) {
                        setError(error?.reason);
                    } else {
                        setError(error?.message);
                    }
                }
            }
        } else if (
            type === "withdraw" &&
            pendingTransaction &&
            pendingTransactionTokenQuery?.status === "success" &&
            pendingTransactionTokenQuery.token !== undefined
        ) {
            const erc20PredicateAddress = await typeToVault(); //generate predicate address
            try {
                //try to check the allowance of the token (else you can't estimate gas)
                const tx = await checkAllowance(erc20PredicateAddress);
                if (tx) {
                    //if the tx is returned, the allowance was approved
                    tx.wait(1); //wait for the confirmation of approve()
                    //and estimate the gas
                    const gas = await estimateGas(
                        pendingTransaction.amount,
                        pendingTransactionTokenQuery.token,
                        type,
                        merkleProof?.params,
                        merkleProof?.proof
                    );
                    setGasFee(parseFloat(gas as string));
                } else {
                    //else, if the tx comes undefined, but no error was thrown
                    //the user already approved token spending
                    //then estimate the gas

                    const gas = await estimateGas(
                        pendingTransaction.amount,
                        pendingTransactionTokenQuery.token,
                        type,
                        merkleProof?.params,
                        merkleProof?.proof
                    );
                    setGasFee(parseFloat(gas as string));
                }
            } catch (error: any) {
                console.error(error);
                setGasFee(0);
                //else, the user did not approve or doesn't have enought tokens and we see the error
                if (error?.reason) {
                    if (error?.reason.includes("EXIT_ALREADY_PROCESSED")) {
                        sessionStorage["CCDWaitExitConfirmation"] = true;
                    } else {
                        setError(error?.reason);
                    }
                } else {
                    setError(error?.message);
                }
            }
        }
    };

    const ethWithdraw = async () => {
        if (merkleProof && sessionStorage["CCDSameSession"] && step === "progress-withdraw") {
            await eth_withdraw(merkleProof?.params, merkleProof?.proof);
        }
    };

    const initTransactionHandler = (transaction: Components.Schemas.WalletWithdrawTx) => {
        setEventId(transaction.origin_event_index);
        setCcdWithdrawTxHash(transaction.origin_tx_hash);
    };

    const pendingTransactionContinueHandler = async (transaction: Components.Schemas.WalletWithdrawTx) => {
        if (pendingContinueClicked) return;
        if (merkleProof) {
            setPendingContinueClicked(true);
            setIsPending(true);
            const tx = await eth_withdraw(merkleProof?.params, merkleProof?.proof);

            if (tx) {
                const tokenQuery = getTransactionToken({ Withdraw: transaction });
                if (tokenQuery.status !== "success" || tokenQuery.token === undefined) {
                    return;
                }

                const parsedAmount = parseAmount(transaction.amount, tokenQuery.token.decimals);
                setAmount(parsedAmount.toString());
                setSelectedToken(tokenQuery.token);
                setStep("progress-withdraw");
                setCcdWithdrawTxHash(transaction.origin_tx_hash);
                setEventId(undefined);
                setPendingContinueClicked(false);
            } else {
                setError("Something went wrong.");
            }
        }
    };

    const pendingTransactionCancelHandler = () => {
        setEventId(undefined);
        setCcdWithdrawTxHash(undefined);
        setPendingTransaction(undefined);
        sessionStorage["CCDCancelledPending"] = true;
    };

    // effects

    useEffect(() => {
        if (depositData) {
            if (depositData?.status === "processed") {
                setDepositTx(undefined);
                setTransferStatus(depositStatusMap.get(depositData?.status) as string);
                setTransferStep(parseFloat(depositStatusMap.get(depositData?.status + "_number") as string));
            } else {
                if (depositStatusMap.get(depositData?.status)) {
                    //if the status is defined in the map
                    setTransferStatus(depositStatusMap.get(depositData?.status) as string); // set it
                    setTransferStep(parseFloat(depositStatusMap.get(depositData?.status + "_number") as string));
                } else {
                    setTransferStatus("");
                    setTransferStep(0); //else maybe a problem occured and we reset it
                    setDepositTx(undefined); //also reset the tx hash to stop the query hook
                    throw new Error(`Deposit failed. Last status: ${depositData?.status}`);
                }
            }
        }
    }, [depositData]);

    useEffect(() => {
        if (watchWithdrawData) {
            if (watchWithdrawData?.status === "processed") {
                setCcdWithdrawTxHash(undefined);
                setEventId(undefined);
                setPendingTransaction(undefined);
                setWithdrawApproved(false);
                setCcdApproveTxResult(false);
                setCcdApproveTxHash(undefined);
                setIsPending(false);
                delete sessionStorage["CCDSameSession"];
                setTransferStatus(withdrawStatusMap.get(watchWithdrawData?.status) as string);
                setTransferStep(parseFloat(withdrawStatusMap.get(watchWithdrawData?.status + "_number") as string));
            } else {
                if (withdrawStatusMap.get(watchWithdrawData?.status)) {
                    // if the status is defined in the map
                    if (watchWithdrawData?.status === "pending") {
                        setEventId((watchWithdrawData as any)?.concordium_event_id);
                    }
                    setTransferStatus(withdrawStatusMap.get(watchWithdrawData?.status) as string); // set it
                    setTransferStep(parseFloat(withdrawStatusMap.get(watchWithdrawData?.status + "_number") as string));
                } else {
                    setTransferStatus("");
                    setTransferStep(0); // else maybe a problem occured and we reset it
                    setDepositTx(undefined); // also reset the tx hash to stop the query hook
                    setEventId(undefined);
                    throw new Error(`Withdraw failed. Last status: ${watchWithdrawData?.status}`);
                }
            }
        }
    }, [watchWithdrawData, ccdWithdrawTxHash]);

    useEffect(() => {
        if (merkleProof && !!ccdWithdrawTxHash) {
            fetchGas("withdraw");
        }
        if (
            merkleProof &&
            ccdWithdrawTxHash !== pendingTransaction?.origin_tx_hash &&
            sessionStorage["CCDSameSession"]
        ) {
            setEventId(undefined); // to start again the query for status
            ethWithdraw();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [merkleProof, pendingTransaction]);

    useEffect(() => {
        if (step?.includes("deposit")) {
            fetchGas("deposit");
        } else if (step?.includes("withdraw")) {
            if (merkleProof) {
                fetchGas("withdraw");
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedToken, amount, step, merkleProof, ccdWithdrawTxHash]);

    // these 2 useEffects work together:
    // the first one waits for the approve response, gets the tx hash and passes it to getTransactionStatus
    // we set an interval for once a second and when the status comes finalized we change the state to approved
    // the second one just waits for the withdrawApproved state to become true to try the withdraw
    useEffect(() => {
        const interval = setInterval(() => {
            if (ccdApproveTxResult && ccdApproveTxHash && !withdrawApproved) {
                getTransactionStatus(ccdApproveTxHash).then(async (tx) => {
                    if (tx?.status === "finalized") {
                        setWithdrawApproved(true);
                    }
                });
            }
        }, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ccdApproveTxResult, ccdApproveTxHash, withdrawApproved]);
    useEffect(() => {
        //if the withdraw was approved and we have a token, a result and a hash
        //then the approve was just made(the else in overviewContinueHandler)\
        //so we go ahead with the withdraw
        if (withdrawApproved && selectedToken && ccdApproveTxHash && ccdApproveTxResult) {
            ccdSdkWithdraw();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [withdrawApproved]);

    useEffect(() => {
        // if we have pending transactions
        if (pendingTransactions && pendingTransactions?.length > 0 && !eventId && !ccdWithdrawTxHash && !step) {
            // take the first one and set the state
            setPendingTransaction(pendingTransactions[0]);
            setCcdWithdrawTxHash(pendingTransactions[0].origin_tx_hash);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingTransactions]);

    if (step?.includes("progress")) {
        return (
            <TransferProgress
                transferStatus={transferStep}
                amount={amount}
                token={selectedToken}
                isTablet={isTablet}
                isMobile={isMobile}
                isWithdraw={step.includes("withdraw")}
                onContinue={progressContinueHandler}
                isPending={isPending}
            />
        );
    }

    if (step?.includes("overview")) {
        return (
            <TransferOverview
                gasFee={gasFee}
                energyFee={estimatedWithdrawEnergy}
                withdrawApproveFee={withdrawApproveFee}
                error={error}
                isWithdraw={step.includes("withdraw")}
                onContinue={overviewContinueHandler}
                onCancel={overviewCancelHandler}
                pendingSubmission={overviewPendingSubmission}
            />
        );
    }

    if (
        pendingTransaction &&
        sessionStorage["CCDCurrentTx"] !== pendingTransaction.origin_tx_hash && // this stops the pending transaction component from popping when the same transaction is already finishing
        !sessionStorage["CCDCancelledPending"] &&
        !sessionStorage["CCDWaitExitConfirmation"] &&
        !sessionStorage["CCDSameSession"]
    ) {
        return (
            <PendingTransactions
                transaction={pendingTransaction}
                gasFee={gasFee}
                error={error}
                merkleProof={merkleProof}
                onInitTransaction={initTransactionHandler}
                onContinue={pendingTransactionContinueHandler}
                onCancel={pendingTransactionCancelHandler}
            />
        );
    }

    return (
        <Transfer
            token={selectedToken}
            transferStatus={transferStatus}
            isTablet={isTablet}
            isMobile={isMobile}
            onDeposit={depositHandler}
            onWithdraw={withdrawHandler}
            onHistoryClick={historyClickHandler}
            onSelectToken={selectedTokenHandler}
            onDepositCompleted={depositCompletedHandler}
        />
    );
};

export default Cornucopia;
