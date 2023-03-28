import Text from "@components/atoms/text/text";
import { useGetTransactionToken } from "@hooks/use-transaction-token";
import useEthWallet from "@hooks/use-eth-wallet";
import moment from "moment";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { FC, MouseEventHandler, useContext, useEffect, useState } from "react";
import { useWalletTransactions } from "src/api-query/queries";
import { Components } from "src/api-query/__generated__/AxiosClient";
import { BridgeDirection, routes } from "src/constants/routes";
import { ccdTransactionUrl, ethTransactionUrl } from "src/helpers/chain-explorer";
import isDeposit from "src/helpers/checkTransaction";
import parseTxHash from "src/helpers/parseTxHash";
import { useApprovedWithdrawalsStore } from "src/store/approved-withdraws";
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
import { appContext } from "src/root/app-context";
import { toFractionalAmount } from "src/helpers/number";
import {
    SubmittedTransaction,
    useSubmittedDepositsStore,
    useSubmittedWithdrawalsStore,
} from "src/store/submitted-transactions";

const linkClick: MouseEventHandler = (e) => {
    e.stopPropagation();
};

enum ProcessingStatus {
    Submitted = "Submitted",
    Pending = "Pending",
    Processed = "Processed",
}

const isSubmittedTransaction = (
    tx: Components.Schemas.WalletWithdrawTx | Components.Schemas.WalletDepositTx | SubmittedTransaction
): tx is SubmittedTransaction => (tx as SubmittedTransaction).hash !== undefined;

type DepositRowProps = {
    tx: Components.Schemas.WalletDepositTx | SubmittedTransaction;
    token: Components.Schemas.TokenMapItem;
    onRowClick(): void;
};

const DepositRow: FC<DepositRowProps> = ({ tx, token, onRowClick }) => {
    const { isMobile } = useContext(appContext);

    const formattedAmount = toFractionalAmount(tx.amount, token.decimals);
    const { status, ethHash, ccdHash } = isSubmittedTransaction(tx)
        ? {
              status: ProcessingStatus.Submitted,
              ccdHash: undefined,
              ethHash: tx.hash,
          }
        : {
              status: tx.status.includes("processed") ? ProcessingStatus.Processed : ProcessingStatus.Pending,
              ccdHash: tx.tx_hash,
              ethHash: tx.origin_tx_hash,
          };

    return (
        <TableRow key={ethHash} onClick={onRowClick}>
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
                    {`${formattedAmount} ${token.eth_name}`}
                </Text>
            </TableData>
            {!isMobile && (
                <>
                    <TableData>
                        <Text fontSize="10" fontWeight="light">
                            {ethHash ? (
                                <a
                                    href={ethTransactionUrl(ethHash)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={linkClick}
                                >
                                    {parseTxHash(ethHash)}
                                </a>
                            ) : (
                                "Processing..."
                            )}
                        </Text>
                    </TableData>
                    <TableData>
                        <Text fontSize="10" fontWeight="light">
                            {ccdHash ? (
                                <a
                                    href={ccdTransactionUrl(ccdHash)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={linkClick}
                                >
                                    {parseTxHash(ccdHash)}
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
                    {moment(tx.timestamp * 1000).fromNow()}
                </Text>
            </TableData>
            <TableData>
                <Text
                    fontSize="10"
                    fontWeight="light"
                    fontColor={status === ProcessingStatus.Processed ? "Green" : "Yellow"}
                >
                    {status}
                </Text>
            </TableData>
        </TableRow>
    );
};

type WithdrawRowProps = {
    tx: Components.Schemas.WalletWithdrawTx | SubmittedTransaction;
    token: Components.Schemas.TokenMapItem;
    onRowClick(): void;
};

const WithdrawRow: FC<WithdrawRowProps> = ({ tx, token, onRowClick }) => {
    const { isMobile } = useContext(appContext);
    const { transactions: approvedWithdrawals } = useApprovedWithdrawalsStore();

    const formattedAmount = toFractionalAmount(tx.amount, token.decimals);
    const { status, ethHash, ccdHash } = isSubmittedTransaction(tx)
        ? {
              status: ProcessingStatus.Submitted,
              ethHash: undefined,
              ccdHash: tx.hash,
          }
        : {
              status: tx.status.includes("processed") ? ProcessingStatus.Processed : ProcessingStatus.Pending,
              ethHash: tx.tx_hash ?? approvedWithdrawals[tx.origin_tx_hash ?? ""],
              ccdHash: tx.origin_tx_hash,
          };

    return (
        <TableRow key={ccdHash} onClick={onRowClick}>
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
                    {`${formattedAmount} ${token.ccd_name}`}
                </Text>
            </TableData>
            {!isMobile && (
                <>
                    <TableData>
                        <Text fontSize="10" fontWeight="light">
                            {ccdHash ? (
                                <a
                                    href={ccdTransactionUrl(ccdHash)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={linkClick}
                                >
                                    {parseTxHash(ccdHash)}
                                </a>
                            ) : (
                                "Processing..."
                            )}
                        </Text>
                    </TableData>
                    <TableData>
                        <Text fontSize="10" fontWeight="light" fontColor={ethHash ? "Black" : "Yellow"}>
                            {ethHash ? (
                                <a
                                    href={ethTransactionUrl(ethHash)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={linkClick}
                                >
                                    {parseTxHash(ethHash)}
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
                    {moment(tx.timestamp * 1000).fromNow()}
                </Text>
            </TableData>
            <TableData>
                <Text
                    fontSize="10"
                    fontWeight="light"
                    fontColor={status === ProcessingStatus.Processed ? "Green" : "Yellow"}
                >
                    {status}
                </Text>
            </TableData>
        </TableRow>
    );
};

type Props = {
    depositSelected: boolean;
};

const History = ({ depositSelected }: Props) => {
    const { context } = useEthWallet();
    const { replace } = useRouter();
    const { data: history, isLoading } = useWalletTransactions();
    const { isMobile } = useContext(appContext);
    const { push } = useRouter();

    const [headers, setHeaders] = useState(["From", "To", "Amount", "ETH Trans.", "CCD Trans.", "Time", "Status"]);
    const getTransactionToken = useGetTransactionToken();
    const { transactions: submittedDeposits } = useSubmittedDepositsStore();
    const { transactions: submittedWithdrawals } = useSubmittedWithdrawalsStore();

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
        // NextJS router is only available on the client, so we use `useEffect` to defer running this until the first client side render.
        if (!context.account) {
            replace(depositSelected ? routes.deposit.path : routes.withdraw.path);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [depositSelected]);

    if (!history) {
        return (
            <ContentWrapper>
                <Text>Loading...</Text>
            </ContentWrapper>
        );
    }

    const submittedTransactions = (depositSelected ? submittedDeposits : submittedWithdrawals).filter(
        (st) =>
            !history
                .map((ht) => (isDeposit(ht) ? ht.Deposit.origin_tx_hash : ht.Withdraw.origin_tx_hash))
                .some((hash) => hash === st.hash)
    );

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
                                {submittedTransactions.map((st) =>
                                    depositSelected ? (
                                        <DepositRow
                                            key={st.hash}
                                            tx={st}
                                            token={st.token}
                                            onRowClick={() => push(routes.deposit.tx(st.hash))}
                                        />
                                    ) : (
                                        <WithdrawRow
                                            key={st.hash}
                                            tx={st}
                                            token={st.token}
                                            onRowClick={() => push(routes.withdraw.tx(st.hash))}
                                        />
                                    )
                                )}
                                {history
                                    .slice()
                                    .sort((a, b) => {
                                        const timeA = isDeposit(a) ? a.Deposit.timestamp : a.Withdraw.timestamp;
                                        const timeB = isDeposit(b) ? b.Deposit.timestamp : b.Withdraw.timestamp;

                                        return timeB - timeA; // Most recent transactions shown first
                                    })
                                    .map((tx) => {
                                        const tokenResponse = getTransactionToken(tx);

                                        if (tokenResponse.status !== "success" || tokenResponse.token === undefined) {
                                            return null;
                                        }

                                        if (isDeposit(tx) && depositSelected) {
                                            return (
                                                <DepositRow
                                                    key={tx.Deposit.origin_tx_hash}
                                                    tx={tx.Deposit}
                                                    token={tokenResponse.token}
                                                    onRowClick={() =>
                                                        push(routes.deposit.tx(tx.Deposit.origin_tx_hash ?? ""))
                                                    }
                                                />
                                            );
                                        } else if (!isDeposit(tx) && !depositSelected) {
                                            return (
                                                <WithdrawRow
                                                    key={tx.Withdraw.origin_tx_hash}
                                                    tx={tx.Withdraw}
                                                    token={tokenResponse.token}
                                                    onRowClick={() =>
                                                        push(routes.withdraw.tx(tx.Withdraw.origin_tx_hash ?? ""))
                                                    }
                                                />
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
