export enum BridgeDirection {
    Deposit = "deposit",
    Withdraw = "withdraw",
}

export const routes = {
    deposit: {
        path: "/deposit",
        overview: "/deposit/overview",
        tx: (ethTxHash: string) => `/deposit/${ethTxHash}`,
    },
    withdraw: {
        path: "/withdraw",
        overview: "/withdraw/overview",
        tx: {
            path: (ccdTxHash: string) => `/withdraw/${ccdTxHash}`,
            approve: (ccdTxHash: string) => `/withdraw/${ccdTxHash}/approve`,
        },
    },
    history: (direction = BridgeDirection.Deposit) => `/history/${direction}`,
};
