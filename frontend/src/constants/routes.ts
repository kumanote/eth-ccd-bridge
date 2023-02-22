export enum BridgeDirection {
    Deposit = "deposit",
    Withdraw = "withdraw",
}

export const routes = {
    deposit: {
        path: "/deposit",
        overview: "/deposit/overview",
        tx: (txHash: string) => `/deposit/${txHash}`,
    },
    withdraw: {
        path: "/withdraw",
        overview: "/withdraw/overview",
        tx: {
            path: (txHash: string) => `/withdraw/${txHash}`,
            approve: (txHash: string) => `/withdraw/${txHash}/approve`,
        },
    },
    history: (direction: BridgeDirection) => `/history/${direction}`,
};
