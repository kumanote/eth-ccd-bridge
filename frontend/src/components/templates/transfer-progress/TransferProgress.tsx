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
import { useMemo } from "react";

enum TransferStep {
    Added = 1,
    Pending = 2,
    Processed = 3,
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
    canWithdraw: boolean;
};
type DepositProps = BaseProps & {
    isWithdraw?: false;
};

type Props = WithdrawProps | DepositProps;

export const TransferProgress: React.FC<Props> = (props) => {
    const { transferStatus, isWithdraw } = props;
    const { push } = useRouter();
    const { token, amount, clear: clearFlowStore } = useTransactionFlowStore();
    const step = useMemo(() => transferStepMap[transferStatus ?? "missing"], [transferStatus]);

    if (!token || !amount) {
        throw new Error("Expected dependencies to be available");
    }

    const continueHandler = () => {
        push({ pathname: routes.deposit.path, query: { reset: true } });
        clearFlowStore();
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
                                <StyledCircle completed={step > 0} />
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
                                <StyledCircle completed={step > 1} />
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
                                <StyledCircle completed={step > 2} />
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
                    <InfoContainer processed={step > 2}>
                        <Image src={Hourglass.src} width={16.56} height={26.14} alt="Hourglass image" />
                        <Text
                            fontFamily="Roboto"
                            fontSize="13"
                            fontWeight="bold"
                            fontColor="TitleText"
                            fontLetterSpacing="0"
                        >
                            {props.isWithdraw
                                ? step > 2
                                    ? "Withdraw Processed!"
                                    : props.canWithdraw
                                    ? "Your withdraw will be ready very soon."
                                    : "Your withdraw is in progress. Please come back later."
                                : step > 2
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
                            {props.isWithdraw
                                ? step > 2
                                    ? "You can now see it in your transaction history!"
                                    : props.canWithdraw
                                    ? ""
                                    : "When returning to the bridge, you will be prompted to finish the withdraw."
                                : step > 2
                                ? "You can now see your finished transaction in History!"
                                : "After the transaction is processed you can also check it in your transaction history."}
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
