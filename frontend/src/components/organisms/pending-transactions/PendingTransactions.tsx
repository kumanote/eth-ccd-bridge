import Button from "@components/atoms/button/Button";
import Text from "@components/atoms/text/text";
import usePrice from "@hooks/use-price";
import { useGetTransactionToken } from "@hooks/use-transaction-token";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Components } from "src/api-query/__generated__/AxiosClient";
import parseAmount from "src/helpers/parseAmount";
import EthereumIcon from "../../../../public/icons/ethereum-icon.svg";
import { ButtonsContainer, GapWrapper, StyledContainer, Wrapper } from "./PendingTransactions.style";

interface Props {
    transaction: Components.Schemas.WalletWithdrawTx;
    gasFee: number;
    error: string;
    onInitTransaction: Function;
    merkleProof?: Components.Schemas.EthMerkleProofResponse;
    onContinue: Function;
    onCancel: Function;
}

const PendingTransactions: React.FC<Props> = ({
    transaction,
    gasFee,
    error,
    onInitTransaction,
    onContinue,
    onCancel,
    merkleProof,
}) => {
    const getPrice = usePrice();
    const tokenQuery = useGetTransactionToken()({ Withdraw: transaction });

    const [ethPrice, setEthPrice] = useState(0);

    const fetchPrices = async () => {
        const ethPrice = await getPrice("ETH");
        setEthPrice(ethPrice);
    };

    const parseHash = (hash: string) => {
        const length = hash.length;
        const left = hash.slice(0, 5);
        const right = hash.slice(length - 7, length);
        return `${left}...${right}`;
    };

    const continueHandler = () => {
        onContinue(transaction);
    };
    const cancelHandler = () => {
        onCancel();
    };

    useEffect(() => {
        fetchPrices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        onInitTransaction(transaction);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (tokenQuery.status !== "success" || tokenQuery.token === undefined) {
        return null; // TODO: handle properly
    }

    return (
        <Wrapper>
            <StyledContainer>
                <div>
                    <Text
                        fontFamily="Roboto"
                        fontSize="24"
                        fontWeight="light"
                        fontColor="TitleText"
                        fontLetterSpacing="0"
                    >
                        You have a pending withdraw which is ready to be finalized
                    </Text>

                    <GapWrapper>
                        <Text
                            fontFamily="Roboto"
                            fontSize="13"
                            fontWeight="light"
                            fontColor="TitleText"
                            fontLetterSpacing="0"
                        >
                            Amount:
                        </Text>
                        <Text
                            fontFamily="Roboto"
                            fontSize="11"
                            fontWeight="bold"
                            fontColor="TitleText"
                            fontLetterSpacing="0"
                        >
                            {`${parseAmount(transaction.amount, tokenQuery.token.decimals)} ${
                                tokenQuery.token.ccd_name
                            }`}
                        </Text>
                    </GapWrapper>
                    {/* TODO: show timestamp? */}
                    {/* <GapWrapper> */}
                    {/*     <Text */}
                    {/*         fontFamily="Roboto" */}
                    {/*         fontSize="13" */}
                    {/*         fontWeight="light" */}
                    {/*         fontColor="TitleText" */}
                    {/*         fontLetterSpacing="0" */}
                    {/*     > */}
                    {/*         Timestamp: */}
                    {/*     </Text> */}
                    {/*     <Text */}
                    {/*         fontFamily="Roboto" */}
                    {/*         fontSize="11" */}
                    {/*         fontWeight="bold" */}
                    {/*         fontColor="TitleText" */}
                    {/*         fontLetterSpacing="0" */}
                    {/*     > */}
                    {/*         {moment(transaction.timestamp * 1000).fromNow()} */}
                    {/*     </Text> */}
                    {/* </GapWrapper> */}
                    <GapWrapper>
                        <Text
                            fontFamily="Roboto"
                            fontSize="13"
                            fontWeight="light"
                            fontColor="TitleText"
                            fontLetterSpacing="0"
                        >
                            Concordium transaction hash:{" "}
                        </Text>
                        <Text
                            fontFamily="Roboto"
                            fontSize="11"
                            fontWeight="bold"
                            fontColor="TitleText"
                            fontLetterSpacing="0"
                        >
                            {transaction.origin_tx_hash ? (
                                <a
                                    href={`https://testnet.ccdscan.io/?dcount=1&dentity=transaction&dhash=${transaction.origin_tx_hash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {parseHash(transaction.origin_tx_hash)}
                                </a>
                            ) : (
                                "Pending..."
                            )}
                        </Text>
                    </GapWrapper>

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
                    <GapWrapper>
                        <Image src={EthereumIcon.src} alt="Ethereum Icon" height="20" width="20" />
                        <Text
                            fontFamily="Roboto"
                            fontSize="11"
                            fontWeight="light"
                            fontColor="TitleText"
                            fontLetterSpacing="0"
                        >
                            Withdraw complete:
                        </Text>
                        <Text
                            fontFamily="Roboto"
                            fontSize="11"
                            fontWeight="bold"
                            fontColor="TitleText"
                            fontLetterSpacing="0"
                        >
                            {`~${gasFee} ETH (${(gasFee * ethPrice).toFixed(4)} USD)`}
                        </Text>
                    </GapWrapper>

                    {error && (
                        <Text fontSize="12" fontWeight="light" fontColor="Red">
                            {error}
                        </Text>
                    )}
                </div>
                <ButtonsContainer>
                    <Button variant="secondary" onClick={cancelHandler}>
                        <div style={{ position: "relative" }}>
                            <Text fontSize="16" fontColor="Black" fontWeight="bold">
                                Cancel
                            </Text>
                        </div>
                    </Button>
                    <Button variant="primary" onClick={continueHandler} disabled={!merkleProof}>
                        <div style={{ position: "relative" }}>
                            <Text fontSize="16" fontColor="Black" fontWeight="bold">
                                {merkleProof ? "Continue" : "Please wait..."}
                            </Text>
                        </div>
                    </Button>
                </ButtonsContainer>
            </StyledContainer>
        </Wrapper>
    );
};

export default PendingTransactions;
