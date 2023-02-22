import Button from "@components/atoms/button/Button";
import PageWrapper from "@components/atoms/page-wrapper/PageWrapper";
import addresses from "@config/addresses";
import useCCDWallet from "@hooks/use-ccd-wallet";
import usePrice from "@hooks/use-price";
import { useAsyncMemo } from "@hooks/utils";
import Image from "next/image";
import { useRouter } from "next/router";
import { useState } from "react";
import { Components } from "src/api-query/__generated__/AxiosClient";
import { routes } from "src/constants/routes";
import useGenerateContract from "src/contracts/use-generate-contract";
import useRootManagerContract from "src/contracts/use-root-manager";
import { noOp } from "src/helpers/basic";
import { usePreSubmitStore } from "src/store/pre-submit";
import ConcordiumIcon from "../../../../public/icons/concordium-icon.svg";
import EthereumIcon from "../../../../public/icons/ethereum-icon.svg";
import Text from "../../atoms/text/text";
import { ButtonsContainer, StyledContainer, StyledProcessWrapper } from "./TransferOverview.style";

type WithdrawProps = {
    isWithdraw: true;
    txForApproval?: Components.Schemas.WalletWithdrawTx;
};

type DepositProps = {
    isWithdraw?: false;
};

type Props = WithdrawProps | DepositProps;

export const TransferOverview: React.FC<Props> = (props) => {
    const { isWithdraw = false } = props;
    const getPrice = usePrice();
    const [pendingSubmission, setPendingSubmission] = useState(false);
    const [error, setError] = useState<string>();
    const { back, replace } = useRouter();
    const { amount, token, clear } = usePreSubmitStore();
    const { ccdContext } = useCCDWallet();
    const {
        typeToVault,
        depositFor,
        depositEtherFor,
        withdraw: eth_withdraw,
        estimateGas,
    } = useRootManagerContract(ccdContext.account, !!ccdContext.account);
    const { checkAllowance } = useGenerateContract(
        token?.eth_address as string, // address or empty string because the address is undefined on first renders
        !!token && !!amount // plus it's disabled on the first render anyway
    );

    const gasFee =
        useAsyncMemo(
            async () => {
                if (!amount || !token) {
                    return undefined;
                }

                if (!isWithdraw) {
                    // if the token is ETH, you can estimate without allowance
                    if (token.eth_address !== addresses.eth) {
                        const erc20PredicateAddress = await typeToVault(); //generate predicate address
                        // try to check the allowance of the token (else you can't estimate gas)
                        const tx = await checkAllowance(erc20PredicateAddress);

                        if (tx) {
                            // if the tx is returned, the allowance was approved
                            // wait for the confirmation of approve()
                            // and estimate the gas
                            await tx.wait(1);
                        }
                    }

                    const gas = await estimateGas(amount, token, "deposit");
                    return parseFloat(gas as string);
                } else if (props.isWithdraw && props.txForApproval !== undefined) {
                    // TODO: Get the GAS fee for approving the ETH transaction. This requires the merkle proof as well.
                    const erc20PredicateAddress = await typeToVault(); //generate predicate address
                    //try to check the allowance of the token (else you can't estimate gas)
                    const tx = await checkAllowance(erc20PredicateAddress);
                    if (tx) {
                        //if the tx is returned, the allowance was approved
                        tx.wait(1); //wait for the confirmation of approve()
                        //and estimate the gas
                    }

                    // TODO: ...
                    // const gas = await estimateGas(
                    //     pendingTransaction.amount,
                    //     pendingTransactionTokenQuery.token,
                    //     type,
                    //     merkleProof?.params,
                    //     merkleProof?.proof
                    // );
                    // return parseFloat(gas as string);

                    return undefined;
                }
            },
            (error: any) => {
                console.error("gas reason:", error);

                // else, the user did not approve or doesn't have enought tokens and we see the error
                if (error?.reason) {
                    if (error?.reason.includes("EXIT_ALREADY_PROCESSED")) {
                        sessionStorage["CCDWaitExitConfirmation"] = true; // TODO: what is this???
                    } else {
                        setError(error?.reason);
                    }
                } else {
                    setError(error?.message);
                }
            },
            [amount, token, isWithdraw]
        ) ?? 0;

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

    // Check necessary values are present from transfer page. These will not be available if this is the first page loaded in the browser.
    if (!amount || !token) {
        replace(isWithdraw ? routes.withdraw.path : routes.deposit.path);
    }

    const submit = () => {
        setPendingSubmission(true);

        // TODO: submit transaction.

        clear();
        setPendingSubmission(false);
    };

    const cancel = () => {
        back();
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

                    {props.isWithdraw && props.txForApproval && (
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
                    <Button variant="secondary" onClick={cancel}>
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
