import Image from "next/image";
import Text from "../../atoms/text/text";
import Hourglass from "../../../../public/icons/Hourglass.svg";
import {
    StyledButtonContainer,
    StyledCircle,
    StyledCircleWrapper,
    StyledHorizontalLine,
    StyledProcessWrapper,
    TransferAmountWrapper,
    ModalTitle,
    Content,
    InfoContainer,
    StyledContainer,
} from "./TransferProgress.style";
import PageWrapper from "@components/atoms/page-wrapper/PageWrapper";
import Button from "@components/atoms/button/Button";
import { useRouter } from "next/router";
import { routes } from "src/constants/routes";
import { useTransactionFlowStore } from "src/store/transaction-flow";
import { Components } from "src/api-query/__generated__/AxiosClient";
import { useMemo, useState } from "react";

type Status = {
    message: string;
    isError: boolean;
};

enum TransferStep {
    Added,
    Pending,
    Processed,
    Failed = -1,
}

const transferStepMap: { [p in Components.Schemas.TransactionStatus]: TransferStep } = {
    missing: TransferStep.Added,
    pending: TransferStep.Pending,
    processed: TransferStep.Processed,
    failed: TransferStep.Failed,
};

type BaseProps = {
    transferStatus?: Components.Schemas.TransactionStatus;
};

type WithdrawProps = BaseProps & {
    isWithdraw: true;
    canWithdraw?: boolean;
    onRequestApproval(
        setError: (message: string) => void,
        setStatus: (message: string | undefined) => void
    ): Promise<void>;
};
type DepositProps = BaseProps & {
    isWithdraw?: false;
};

type Props = WithdrawProps | DepositProps;

export const TransferProgress: React.FC<Props> = (props) => {
    const { transferStatus, isWithdraw } = props;
    const { push } = useRouter();
    const [status, setStatus] = useState<Status | undefined>();
    const { token, amount, clear: clearFlowStore } = useTransactionFlowStore();
    const step = useMemo(() => transferStepMap[transferStatus ?? "missing"], [transferStatus]);

    const setError = (message: string) => setStatus({ isError: true, message });
    const setInfo = (message: string | undefined) =>
        setStatus(message !== undefined ? { isError: false, message } : undefined);

    if (!token || !amount) {
        throw new Error("Expected dependencies to be available");
    }

    const continueHandler = async () => {
        if (props.isWithdraw && props.canWithdraw) {
            setStatus(undefined);

            await props.onRequestApproval(setError, setInfo);
        } else {
            push({ pathname: routes.deposit.path, query: { reset: true } });
            clearFlowStore();
        }
    };

    return (
        <PageWrapper>
            <StyledContainer>
                <ModalTitle>
                    <Text
                        fontFamily="Roboto"
                        fontSize="24"
                        fontWeight="light"
                        fontColor="TitleText"
                        fontLetterSpacing="0"
                    >
                        {isWithdraw ? "Withdraw in progress" : "Deposit in progress"}
                    </Text>
                </ModalTitle>
                <Content>
                    <div>
                        <StyledProcessWrapper>
                            <StyledHorizontalLine />
                            <StyledCircleWrapper index={1}>
                                <StyledCircle completed={step === 0} />
                                <Text
                                    fontFamily="Roboto"
                                    fontSize="13"
                                    fontWeight="light"
                                    fontColor="TitleText"
                                    fontLetterSpacing="0"
                                >
                                    {isWithdraw ? "Initialised" : "Adding..."}
                                </Text>
                            </StyledCircleWrapper>

                            <StyledCircleWrapper index={2}>
                                <StyledCircle completed={step > 0} />
                                <Text
                                    fontFamily="Roboto"
                                    fontSize="13"
                                    fontWeight="light"
                                    fontColor="TitleText"
                                    fontLetterSpacing="0"
                                >
                                    Pending...
                                </Text>
                            </StyledCircleWrapper>

                            <StyledCircleWrapper index={3}>
                                <StyledCircle completed={step > 1} />
                                <Text
                                    fontFamily="Roboto"
                                    fontSize="13"
                                    fontWeight="light"
                                    fontColor="TitleText"
                                    fontLetterSpacing="0"
                                >
                                    Processed!
                                </Text>
                            </StyledCircleWrapper>
                        </StyledProcessWrapper>
                        <TransferAmountWrapper>
                            <Text fontSize="16" fontColor="White" fontWeight="light">
                                Transfer Amount:&nbsp;
                            </Text>
                            <Text fontSize="16" fontColor="White" fontWeight="bold">
                                {amount} {isWithdraw ? token?.ccd_name : token?.eth_name}
                            </Text>
                        </TransferAmountWrapper>
                    </div>
                    <InfoContainer processed={step > 1}>
                        <Image src={Hourglass.src} width={16.56} height={26.14} alt="Hourglass image" />
                        <Text
                            fontFamily="Roboto"
                            fontSize="13"
                            fontWeight="bold"
                            fontColor="TitleText"
                            fontLetterSpacing="0"
                        >
                            {props.isWithdraw
                                ? step > 1
                                    ? "Withdraw Processed!"
                                    : props.canWithdraw
                                    ? "Your withdraw will be ready very soon."
                                    : "Your withdraw is in progress. Please come back later."
                                : step > 1
                                ? "Deposit Processed!"
                                : "Your deposit is in progress."}
                        </Text>
                        <Text
                            fontFamily="Roboto"
                            fontSize="11"
                            fontWeight="light"
                            fontColor="TitleText"
                            fontLetterSpacing="0"
                        >
                            <>
                                {status !== undefined && status}
                                {status === undefined && props.isWithdraw
                                    ? step > 1
                                        ? "You can now see it in your transaction history!"
                                        : props.canWithdraw
                                        ? ""
                                        : "When returning to the bridge, you can fininsh the withdraw from the transaction history."
                                    : step > 1
                                    ? "You can now see your finished transaction in History!"
                                    : "After the transaction is processed you can also check it in your transaction history."}
                            </>
                        </Text>
                    </InfoContainer>
                    <StyledButtonContainer>
                        <Button variant="primary" onClick={continueHandler}>
                            <div style={{ position: "relative" }}>
                                <Text fontSize="16" fontColor={"Black"} fontWeight="bold">
                                    Continue
                                </Text>
                            </div>
                        </Button>
                    </StyledButtonContainer>
                </Content>
            </StyledContainer>
        </PageWrapper>
    );
};
