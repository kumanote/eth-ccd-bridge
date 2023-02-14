import Image from "next/image";
import { Components } from "src/api-query/__generated__/AxiosClient";
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

type Props = {
    isWithdraw: boolean;
    onContinue: Function;
    transferStatus: number;
    isTablet: boolean;
    isMobile: boolean;
    amount: string;
    token?: Components.Schemas.TokenMapItem;
    isPending: boolean;
};

export const TransferProgress: React.FC<Props> = ({
    isWithdraw,
    onContinue,
    transferStatus,
    isTablet,
    isMobile,
    amount,
    token,
    isPending,
}) => {
    const continueHandler = () => {
        onContinue();
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
                                <StyledCircle completed={isWithdraw ? transferStatus > 0 : transferStatus > 1} />
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
                                <StyledCircle completed={isWithdraw ? transferStatus > 1 : transferStatus > 3} />
                                <Text
                                    fontFamily="Roboto"
                                    fontSize="13"
                                    fontWeight="light"
                                    fontColor="TitleText"
                                    fontLetterSpacing="0"
                                >
                                    {isWithdraw ? "Pending..." : "Pending..."}
                                </Text>
                            </StyledCircleWrapper>

                            <StyledCircleWrapper index={3}>
                                <StyledCircle completed={isWithdraw ? transferStatus > 2 : transferStatus > 4} />
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
                                {amount} {isWithdraw ? token?.ccd_token?.name : token?.eth_token?.name}
                            </Text>
                        </TransferAmountWrapper>
                    </div>
                    <InfoContainer processed={isWithdraw ? transferStatus > 2 : transferStatus > 4}>
                        <Image src={Hourglass.src} width={16.56} height={26.14} alt="Hourglass image" />
                        <Text
                            fontFamily="Roboto"
                            fontSize="13"
                            fontWeight="bold"
                            fontColor="TitleText"
                            fontLetterSpacing="0"
                        >
                            {isWithdraw
                                ? transferStatus > 2
                                    ? "Withdraw Processed!"
                                    : isPending
                                    ? "Your withdraw will be ready very soon."
                                    : "Your withdraw is in progress. Please come back later."
                                : transferStatus > 4
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
                            {isWithdraw
                                ? transferStatus > 2
                                    ? "You can now see it in your transaction history!"
                                    : isPending
                                    ? ""
                                    : "When returning to the bridge, you will be prompted to finish the withdraw."
                                : transferStatus > 3
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
