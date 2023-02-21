export function transactionUrl(transactionHash: string) {
    return `${process.env.NEXT_PUBLIC_CCDSCAN_URL}?dcount=1&dentity=transaction&dhash=${transactionHash}`;
}
