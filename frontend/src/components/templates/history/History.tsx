import InfoArrow from "@components/atoms/info-arrow/InfoArrow";
import Text from "@components/atoms/text/text";
import useMediaQuery from "@hooks/use-media-query";
import { useGetTransactionToken } from "@hooks/use-transaction-token";
import useWallet from "@hooks/use-wallet";
import moment from "moment";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { MouseEventHandler, useEffect, useState } from "react";
import useWalletTransactions from "src/api-query/use-wallet-transactions/useWalletTransactions";
import { Components } from "src/api-query/__generated__/AxiosClient";
import { BridgeDirection, routes } from "src/constants/routes";
import { transactionUrl } from "src/helpers/ccdscan";
import isDeposit from "src/helpers/checkTransaction";
import parseAmount from "src/helpers/parseAmount";
import parseTxHash from "src/helpers/parseTxHash";
import {
    ContentWrapper,
    HistoryTable,
    HistoryWrapper,
    LinkWrapper,
    StyledTab,
    TableData,
    TableHeader,
    TableRow,
    TableTitle,
    TableWrapper,
    TabsWrapper,
} from "./History.style";

type Props = {
    depositSelected: boolean;
};

const History = ({ depositSelected }: Props) => {
    const { context } = useWallet();
    const { replace } = useRouter();
    const { data: history, isLoading } = useWalletTransactions();
    const isMobile = useMediaQuery("(max-width: 540px)");
    const { push } = useRouter();

    const [headers, setHeaders] = useState(["From", "To", "Amount", "ETH Trans.", "CCD Trans.", "Time", "Status"]);
    const getTransactionToken = useGetTransactionToken();

    const goToProgress = (transaction: Components.Schemas.WalletTx) => {
        const txHash = isDeposit(transaction)
            ? transaction.Deposit.origin_tx_hash
            : transaction.Withdraw.origin_tx_hash;

        if (!txHash) {
            return;
        }

        const route = isDeposit(transaction) ? routes.deposit.tx(txHash) : routes.withdraw.tx(txHash);
        push(route);
    };

    const linkClick: MouseEventHandler = (e) => {
        e.stopPropagation();
    };

    useEffect(() => {
        if (isMobile) {
            setHeaders(["From", "To", "Amount", "Time", "Status"]);
        } else {
            if (depositSelected) {
                setHeaders(["From", "To", "Amount", "ETH Trans.", "CCD Trans.", "Time", "Status"]);
            } else {
                setHeaders(["From", "To", "Amount", "CCD Trans.", "ETH Trans.", "Time", "Status"]);
            }
        }
    }, [depositSelected, isMobile]);

    useEffect(() => {
        moment.locale("en", {
            relativeTime: {
                future: "in %s",
                past: "%s ago",
                s: "1s",
                ss: "%ss",
                m: "1m",
                mm: "%dm",
                h: "1h",
                hh: "%dh",
                d: "1d",
                dd: "%dd",
                M: "1M",
                MM: "%dM",
                y: "1Y",
                yy: "%dY",
            },
        });
    }, []);

    useEffect(() => {
        // Effects only run client-side, nextJS router is only available on the client.
        if (!context.account) {
            replace(routes.deposit.path);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!history) {
        return (
            <ContentWrapper>
                <Text>Loading...</Text>
            </ContentWrapper>
        );
    }

    return (
        <ContentWrapper>
            <HistoryWrapper>
                <TableTitle>
                    <Text fontSize="24" fontColor="TitleText" fontWeight="light">
                        History
                    </Text>
                </TableTitle>
                <TabsWrapper>
                    <Link href={routes.history(BridgeDirection.Deposit)} passHref legacyBehavior>
                        <StyledTab active={!depositSelected}>
                            <Text fontWeight={depositSelected ? "bold" : "regular"}>Deposit</Text>
                        </StyledTab>
                    </Link>
                    <Link href={routes.history(BridgeDirection.Withdraw)} passHref legacyBehavior>
                        <StyledTab active={depositSelected}>
                            <Text fontWeight={!depositSelected ? "bold" : "regular"}>Withdraw</Text>
                        </StyledTab>
                    </Link>
                </TabsWrapper>
                {!isLoading && (
                    <TableWrapper>
                        <HistoryTable>
                            <thead>
                                <TableRow>
                                    {headers.map((header) => (
                                        <TableHeader key={`${header} header`}>
                                            <Text fontSize="11" fontColor="Black" fontWeight="bold">
                                                {header}
                                            </Text>
                                        </TableHeader>
                                    ))}
                                </TableRow>
                            </thead>
                            <tbody>
                                {history.map((transaction, index) => {
                                    const tokenReponse = getTransactionToken(transaction);

                                    if (tokenReponse.status !== "success" || tokenReponse.token === undefined) {
                                        return null; // TODO: handle this properly
                                    }
                                    {
                                        /* check if the transaction is a deposit or withdraw, then render based on that */
                                    }
                                    if (isDeposit(transaction) && depositSelected) {
                                        const processed = transaction.Deposit.status.includes("processed");

                                        const parsedAmount = parseAmount(
                                            transaction.Deposit.amount,
                                            tokenReponse.token.decimals
                                        );

                                        return (
                                            <TableRow
                                                key={transaction.Deposit.origin_tx_hash}
                                                onClick={() => goToProgress(transaction)}
                                            >
                                                <TableData>
                                                    <Text fontSize="10" fontWeight="light">
                                                        Ethereum
                                                    </Text>
                                                </TableData>
                                                <TableData>
                                                    <Text fontSize="10" fontWeight="light">
                                                        Concordium
                                                    </Text>
                                                </TableData>
                                                <TableData>
                                                    <Text fontSize="10" fontWeight="light">
                                                        {`${parsedAmount} ${tokenReponse.token.eth_name}`}
                                                    </Text>
                                                </TableData>
                                                {!isMobile && (
                                                    <>
                                                        <TableData>
                                                            <Text fontSize="10" fontWeight="light">
                                                                {transaction.Deposit.origin_tx_hash ? (
                                                                    <a
                                                                        href={`https://goerli.etherscan.io/tx/${transaction.Deposit.origin_tx_hash}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        onClick={linkClick}
                                                                    >
                                                                        {parseTxHash(
                                                                            transaction.Deposit.origin_tx_hash
                                                                        )}
                                                                    </a>
                                                                ) : (
                                                                    "Processing..."
                                                                )}
                                                            </Text>
                                                        </TableData>
                                                        <TableData>
                                                            <Text fontSize="10" fontWeight="light">
                                                                {transaction.Deposit.tx_hash ? (
                                                                    <a
                                                                        href={transactionUrl(
                                                                            transaction.Deposit.tx_hash
                                                                        )}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        onClick={linkClick}
                                                                    >
                                                                        {parseTxHash(transaction.Deposit.tx_hash)}
                                                                    </a>
                                                                ) : (
                                                                    "Processing..."
                                                                )}
                                                            </Text>
                                                        </TableData>
                                                    </>
                                                )}
                                                <TableData>
                                                    <Text fontSize="10" fontWeight="light">
                                                        {moment(transaction.Deposit.timestamp * 1000).fromNow()}
                                                    </Text>
                                                </TableData>
                                                <TableData>
                                                    <Text
                                                        fontSize="10"
                                                        fontWeight="light"
                                                        fontColor={processed ? "Green" : "Yellow"}
                                                    >
                                                        {processed ? "Processed" : "Pending"}
                                                    </Text>
                                                </TableData>
                                            </TableRow>
                                        );
                                    } else if (!isDeposit(transaction) && !depositSelected) {
                                        const processed = transaction.Withdraw.status.includes("processed");

                                        const parsedAmount = parseAmount(
                                            transaction.Withdraw.amount,
                                            tokenReponse.token.decimals
                                        );

                                        return (
                                            <TableRow
                                                key={transaction.Withdraw.origin_tx_hash}
                                                onClick={() => goToProgress(transaction)}
                                            >
                                                <TableData>
                                                    <Text fontSize="10" fontWeight="light">
                                                        Concordium
                                                    </Text>
                                                </TableData>
                                                <TableData>
                                                    <Text fontSize="10" fontWeight="light">
                                                        Ethereum
                                                    </Text>
                                                </TableData>
                                                <TableData>
                                                    <Text fontSize="10" fontWeight="light">
                                                        {`${parsedAmount} ${tokenReponse.token.ccd_name}`}
                                                    </Text>
                                                </TableData>
                                                {!isMobile && (
                                                    <>
                                                        <TableData>
                                                            <Text fontSize="10" fontWeight="light">
                                                                {transaction.Withdraw.origin_tx_hash ? (
                                                                    <a
                                                                        href={transactionUrl(
                                                                            transaction.Withdraw.origin_tx_hash
                                                                        )}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        onClick={linkClick}
                                                                    >
                                                                        {parseTxHash(
                                                                            transaction.Withdraw.origin_tx_hash
                                                                        )}
                                                                    </a>
                                                                ) : (
                                                                    "Processing..."
                                                                )}
                                                            </Text>
                                                        </TableData>
                                                        <TableData>
                                                            <Text
                                                                fontSize="10"
                                                                fontWeight="light"
                                                                fontColor={
                                                                    transaction.Withdraw.tx_hash ? "Black" : "Yellow"
                                                                }
                                                            >
                                                                {transaction.Withdraw.tx_hash ? (
                                                                    <a
                                                                        href={`https://goerli.etherscan.io/tx/${transaction.Withdraw.tx_hash}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        onClick={linkClick}
                                                                    >
                                                                        {parseTxHash(transaction.Withdraw.tx_hash)}
                                                                    </a>
                                                                ) : (
                                                                    "Processing..."
                                                                )}
                                                            </Text>
                                                        </TableData>
                                                    </>
                                                )}
                                                <TableData>
                                                    <Text fontSize="10" fontWeight="light">
                                                        {moment(transaction.Withdraw.timestamp * 1000).fromNow()}
                                                    </Text>
                                                </TableData>
                                                <TableData>
                                                    <Text
                                                        fontSize="10"
                                                        fontWeight="light"
                                                        fontColor={processed ? "Green" : "Yellow"}
                                                    >
                                                        {processed ? "Processed" : "Pending"}
                                                    </Text>
                                                </TableData>
                                            </TableRow>
                                        );
                                    }
                                })}
                            </tbody>
                        </HistoryTable>
                    </TableWrapper>
                )}
            </HistoryWrapper>
            <Link href={routes.deposit.path} passHref legacyBehavior>
                <LinkWrapper>
                    <Text fontSize="12" fontColor="Brown">
                        Back
                    </Text>
                </LinkWrapper>
            </Link>
        </ContentWrapper>
    );
};

export default History;
