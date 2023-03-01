import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { NextRouter } from "next/router";
import { UrlObject } from "url";

export type QueryRouter<T extends UrlObject["query"]> = NextRouter & { query: Partial<T> };

declare global {
    interface Window {
        concordium: WalletApi | undefined;
    }
}
