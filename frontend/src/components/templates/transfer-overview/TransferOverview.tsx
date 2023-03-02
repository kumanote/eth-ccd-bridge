import Button from "@components/atoms/button/Button";
import PageWrapper from "@components/atoms/page-wrapper/PageWrapper";
import Image from "next/image";
import { useRouter } from "next/router";
import { FC, ReactElement, ReactNode, useState } from "react";
import ConcordiumIcon from "../../../../public/icons/concordium-icon.svg";
import EthereumIcon from "../../../../public/icons/ethereum-icon.svg";
import Text from "../../atoms/text/text";
import { ButtonsContainer, StyledContainer, StyledProcessWrapper } from "./TransferOverview.style";

type TransferOverviewLineProps = {
    isEth?: boolean;
    title: ReactNode;
    fee: ReactNode;
};

export const TransferOverviewLine: FC<TransferOverviewLineProps> = ({ isEth = false, title, fee }) => (
    <StyledProcessWrapper>
        <Image
            src={isEth ? EthereumIcon.src : ConcordiumIcon.src}
            alt={isEth ? "Ethereum Icon" : "Concordium Icon"}
            height="20"
            width="20"
        />
        <Text fontFamily="Roboto" fontSize="11" fontWeight="light" fontColor="TitleText" fontLetterSpacing="0">
            {title}
        </Text>
        <Text fontFamily="Roboto" fontSize="11" fontWeight="bold" fontColor="TitleText" fontLetterSpacing="0">
            {fee}
        </Text>
    </StyledProcessWrapper>
);

type TransferOverviewStatus = {
    message: string;
    isError: boolean;
};

export const useTransferOverviewStatusState = () => {
    const [status, setStatus] = useState<TransferOverviewStatus>();
    const setError = (message: string) => setStatus({ isError: true, message });
    const setInfo = (message: string) => setStatus({ isError: false, message });

    return {
        status,
        setError,
        setInfo,
    };
};

type Child = false | undefined | ReactElement<TransferOverviewLineProps>;

type Props = {
    /**
     * Callback function for handling submission for specific flow.
     * Expects route of next page to be returned, or undefined if an error happened.
     */
    handleSubmit(): Promise<string | undefined>;
    status?: TransferOverviewStatus;
    title: string;
    timeToComplete: string;
    children: Child | Child[];
};

export const TransferOverview = ({ handleSubmit, status, title, timeToComplete, children }: Props) => {
    const [pendingSubmission, setPendingSubmission] = useState(false);
    const { back, push } = useRouter();

    const submit = async () => {
        setPendingSubmission(true);
        const nextRoute = await handleSubmit();
        setPendingSubmission(false);

        if (nextRoute) {
            push(nextRoute);
        }
    };

    return (
        <PageWrapper>
            <StyledContainer>
                <Text fontFamily="Roboto" fontSize="24" fontWeight="light" fontColor="TitleText" fontLetterSpacing="0">
                    {title}
                </Text>
                <div>
                    <Text
                        fontFamily="Roboto"
                        fontSize="13"
                        fontWeight="bold"
                        fontColor="TitleText"
                        fontLetterSpacing="0"
                    >
                        {timeToComplete}
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
                    {children}
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
