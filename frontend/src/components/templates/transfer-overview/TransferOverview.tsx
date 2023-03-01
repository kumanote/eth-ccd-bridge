import Button from "@components/atoms/button/Button";
import PageWrapper from "@components/atoms/page-wrapper/PageWrapper";
import useCCDWallet from "@hooks/use-ccd-wallet";
import { useAsyncMemo } from "@hooks/utils";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Components } from "src/api-query/__generated__/AxiosClient";
import { routes } from "src/constants/routes";
import { noOp } from "src/helpers/basic";
import { getPrice } from "src/helpers/price-usd";
import { useTransactionFlowStore } from "src/store/transaction-flow";
import ConcordiumIcon from "../../../../public/icons/concordium-icon.svg";
import EthereumIcon from "../../../../public/icons/ethereum-icon.svg";
import Text from "../../atoms/text/text";
import { ButtonsContainer, StyledContainer, StyledProcessWrapper } from "./TransferOverview.style";

type Status = {
    message: string;
    isError: boolean;
};

type BaseProps = {
    /**
     * Callback function for handling submission for specific flow.
     * Expects route of next page to be returned, or undefined if an error happened.
     */
    handleSubmit(
        token: Components.Schemas.TokenMapItem,
        amount: bigint,
        setError: (message: string) => void,
        setStatus: (message: string) => void
    ): Promise<string | undefined>;
};
type WithdrawProps = BaseProps & {
    isWithdraw: true;
};
type DepositProps = BaseProps & {
    isWithdraw?: false;
    requestGasFee(): Promise<number | undefined>;
    requestAllowance(setError: (message: string) => void, setStatus: (message: string) => void): Promise<boolean>;
    /**
     * `undefined` is treated as value hasn't been loaded yet
     */
    needsAllowance: boolean | undefined;
};

type Props = WithdrawProps | DepositProps;

export const TransferOverview: React.FC<Props> = (props) => {
    const { isWithdraw, handleSubmit } = props;
    const [pendingSubmission, setPendingSubmission] = useState(false);
    const [status, setStatus] = useState<Status>();
    const { back, replace, push } = useRouter();
    const { amount, token: selectedToken } = useTransactionFlowStore();
    const { ccdContext } = useCCDWallet();
    const hasAllowance = !props.isWithdraw && !props.needsAllowance && props.needsAllowance !== undefined;

    /**
     * Gas fee, only available for deposits (otherwise defaults to 0 and is ignored for withdrawals).
     */
    const gasFee = useAsyncMemo(
        async () => {
            if (props.isWithdraw || !hasAllowance) {
                return undefined;
            }

            if (amount === undefined || selectedToken === undefined) {
                throw new Error("Invalid page context.");
            }

            return props.requestGasFee();
        },
        (e) => setStatus({ isError: true, message: e.message }),
        [props.isWithdraw, hasAllowance]
    );

    const ethPrice = useAsyncMemo(async () => getPrice("ETH"), noOp, []) ?? 0;

    const setError = (message: string) => setStatus({ isError: true, message });
    const setInfo = (message: string) => setStatus({ isError: false, message });

    useEffect(() => {
        if (!amount || !selectedToken) {
            replace(isWithdraw ? routes.withdraw.path : routes.deposit.path);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Check necessary values are present from transfer page. These will not be available if this is the first page loaded in the browser.
    if (!amount || !selectedToken) {
        return null;
    }

    const submit = async () => {
        if (!ccdContext.account) {
            throw new Error("Expected page dependencies to be available");
        }

        setPendingSubmission(true);

        let canSubmit = true;
        if (!hasAllowance && !props.isWithdraw) {
            canSubmit = await props.requestAllowance(setError, setInfo);
        }

        let nextRoute: string | undefined;
        if (!canSubmit) {
            setError("Allowance request rejected");
        } else {
            nextRoute = await handleSubmit(selectedToken, amount, setError, setInfo);
        }

        setPendingSubmission(false);

        if (nextRoute) {
            push(nextRoute);
        }
    };

    return (
        <PageWrapper>
            <StyledContainer>
                <Text fontFamily="Roboto" fontSize="24" fontWeight="light" fontColor="TitleText" fontLetterSpacing="0">
                    {isWithdraw ? "Withdraw Overview" : "Deposit Overview"}
                </Text>

                <div>
                    <Text
                        fontFamily="Roboto"
                        fontSize="13"
                        fontWeight="bold"
                        fontColor="TitleText"
                        fontLetterSpacing="0"
                    >
                        {isWithdraw
                            ? "Withdraw should take up to 10 minutes to complete."
                            : "Deposit should take up to 5 minutes to complete."}
                    </Text>
                    <div style={{ marginTop: 12 }} />
                    <Text
                        fontFamily="Roboto"
                        fontSize="13"
                        fontWeight="light"
                        fontColor="TitleText"
                        fontLetterSpacing="0"
                    >
                        Estimation of required fees:
                    </Text>

                    <div style={{ marginTop: 16 }} />
                    <StyledProcessWrapper>
                        <Image
                            src={isWithdraw ? ConcordiumIcon.src : EthereumIcon.src}
                            alt={`${isWithdraw ? "Ethereum Icon" : "Concordium Icon"}`}
                            height="20"
                            width="20"
                        />
                        <Text
                            fontFamily="Roboto"
                            fontSize="11"
                            fontWeight="light"
                            fontColor="TitleText"
                            fontLetterSpacing="0"
                        >
                            {isWithdraw ? "Withdraw initialized:" : "Deposit"}
                        </Text>
                        <Text
                            fontFamily="Roboto"
                            fontSize="11"
                            fontWeight="bold"
                            fontColor="TitleText"
                            fontLetterSpacing="0"
                        >
                            {isWithdraw && "It will be visible when signing the transaction."}
                            {!isWithdraw &&
                                gasFee === undefined &&
                                `${selectedToken.eth_name} allowance needed to estimate network fee.`}
                            {!isWithdraw &&
                                gasFee !== undefined &&
                                `~${gasFee} ETH (${(gasFee * ethPrice).toFixed(4)} USD)`}
                        </Text>
                    </StyledProcessWrapper>

                    {isWithdraw && (
                        <>
                            <StyledProcessWrapper>
                                <Image src={ConcordiumIcon.src} alt="Concordium Icon" height="20" width="20" />
                                <Text
                                    fontFamily="Roboto"
                                    fontSize="11"
                                    fontWeight="light"
                                    fontColor="TitleText"
                                    fontLetterSpacing="0"
                                >
                                    Approve withdraw:
                                </Text>
                                <Text
                                    fontFamily="Roboto"
                                    fontSize="11"
                                    fontWeight="bold"
                                    fontColor="TitleText"
                                    fontLetterSpacing="0"
                                >
                                    It will be visible when signing the transaction.
                                </Text>
                            </StyledProcessWrapper>
                            <div style={{ marginTop: 12 }} />
                            <StyledProcessWrapper>
                                <Image src={EthereumIcon.src} alt={`ccd icon`} height="20" width="20" />
                                <Text
                                    fontFamily="Roboto"
                                    fontSize="11"
                                    fontWeight="light"
                                    fontColor="TitleText"
                                    fontLetterSpacing="0"
                                >
                                    Withdraw complete
                                </Text>
                                <Text
                                    fontFamily="Roboto"
                                    fontSize="11"
                                    fontWeight="bold"
                                    fontColor="TitleText"
                                    fontLetterSpacing="0"
                                >
                                    {!isWithdraw
                                        ? gasFee && `(${(gasFee * ethPrice).toFixed(4)} USD)`
                                        : "Gas estimation will be available after completing the CCD transaction."}
                                </Text>
                            </StyledProcessWrapper>
                        </>
                    )}
                </div>
                <Text fontSize="12" fontWeight="light" fontColor={status?.isError ? "Red" : "Black"} align="center">
                    {status ? status.message : <>&nbsp;</>}
                </Text>
                <ButtonsContainer>
                    <Button variant="secondary" onClick={back}>
                        <div style={{ position: "relative" }}>
                            <Text fontSize="16" fontColor="Black" fontWeight="bold">
                                Cancel
                            </Text>
                        </div>
                    </Button>
                    <Button variant="primary" disabled={pendingSubmission} onClick={submit}>
                        <div style={{ position: "relative" }}>
                            <Text fontSize="16" fontColor="Black" fontWeight="bold">
                                Continue
                            </Text>
                        </div>
                    </Button>
                </ButtonsContainer>
            </StyledContainer>
        </PageWrapper>
    );
};
