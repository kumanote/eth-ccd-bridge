import { WalletApi } from "@concordium/browser-wallet-api-helpers";

export async function detectCcdProvider(timeout = 5000): Promise<WalletApi> {
    return new Promise((resolve, reject) => {
        if (window.concordium) {
            resolve((window as any).concordium);
        } else {
            const t = setTimeout(() => {
                if ((window as any).concordium) {
                    resolve((window as any).concordium);
                } else {
                    reject();
                }
            }, timeout);
            window.addEventListener(
                "concordium#initialized",
                () => {
                    if ((window as any).concordium) {
                        clearTimeout(t);
                        resolve((window as any).concordium);
                    }
                },
                { once: true }
            );
        }
    });
}

export default detectCcdProvider;
