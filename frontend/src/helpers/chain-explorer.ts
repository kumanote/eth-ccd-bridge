import { formatString } from "./string";

export const ccdTransactionUrl = (transactionHash: string) =>
    formatString(process.env.NEXT_PUBLIC_CCDSCAN_URL, transactionHash);

export const ethTransactionUrl = (transactionHash: string) =>
    formatString(process.env.NEXT_PUBLIC_ETHEREUM_EXPLORER_URL, transactionHash);
