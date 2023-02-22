import Button from "@components/atoms/button/Button";
import PageWrapper from "@components/atoms/page-wrapper/PageWrapper";
import usePrice from "@hooks/use-price";
import { useAsyncMemo } from "@hooks/utils";
import Image from "next/image";
import { noOp } from "src/helpers/basic";
import ConcordiumIcon from "../../../../public/icons/concordium-icon.svg";
import EthereumIcon from "../../../../public/icons/ethereum-icon.svg";
import Text from "../../atoms/text/text";
import { ButtonsContainer, StyledContainer, StyledProcessWrapper } from "./TransferOverview.style";

type Props = {
    isWithdraw: boolean;
    onCancel(): void;
    onContinue(): void;
    gasFee: number;
    energyFee: number;
    error: string;
    pendingSubmission: boolean;
    withdrawApproveFee?: number;
};

export const TransferOverview: React.FC<Props> = ({
    isWithdraw,
    onCancel,
    onContinue,
    gasFee,
    error,
    withdrawApproveFee,
    pendingSubmission,
}) => {
    const getPrice = usePrice();

    const { ethPrice = 0 } =
        useAsyncMemo(
            async () => {
                const ethPrice = await getPrice("ETH");
                const ccdPrice = await getPrice("CCD");

                return { ethPrice, ccdPrice };
            },
            noOp,
            [getPrice]
        ) ?? {};

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
                            ? "Wtidhraw should take up to 10 minutes to complete."
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
                            {`${isWithdraw ? "" : "~"}${
                                isWithdraw ? "It will be visible when signing the transaction." : gasFee
                            } ${isWithdraw ? "" : "ETH"} ${isWithdraw ? "" : "("} ${
                                isWithdraw ? "" : (gasFee * ethPrice).toFixed(4)
                            } ${isWithdraw ? "" : "USD)"}`}
                        </Text>
                    </StyledProcessWrapper>

                    {isWithdraw && !!withdrawApproveFee && (
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
                    )}

                    {isWithdraw && (
                        <>
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
                                        ? `(${(gasFee * ethPrice).toFixed(4)} USD)`
                                        : "Gas estimation will be available after completing the CCD transaction."}
                                </Text>
                            </StyledProcessWrapper>
                        </>
                    )}
                    {error && (
                        <Text fontSize="12" fontWeight="light" fontColor="Red">
                            {error}
                        </Text>
                    )}
                </div>
                <ButtonsContainer>
                    <Button variant="secondary" onClick={onCancel}>
                        <div style={{ position: "relative" }}>
                            <Text fontSize="16" fontColor="Black" fontWeight="bold">
                                Cancel
                            </Text>
                        </div>
                    </Button>
                    <Button variant="primary" disabled={pendingSubmission} onClick={onContinue}>
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
