import Layout from "@components/organisms/layout/Layout";
import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
import connectors from "@config/connectors";
import network from "@config/network";
import useMediaQuery from "@hooks/use-media-query";
import moment from "moment";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { routes } from "src/constants/routes";
import { appContext, AppContext } from "src/root/app-context";
import WatchWithdrawals from "src/root/WatchWithdrawals";
import useCCDWalletStore from "src/store/ccd-wallet/ccdWalletStore";
import GlobalStyles from "src/theme/global";
import { QueryRouter } from "src/types/config";
import Web3Provider from "web3-react";
import "../styles/globals.css";

moment.updateLocale("en", {
    relativeTime: {
        future: "in ~%s",
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

const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
    const isTablet = useMediaQuery("(max-width: 1050px)"); // res at which cornucopia logo might touch the modal
    const isMobile = useMediaQuery("(max-width: 540px)"); // res at which the design looks a little weird
    const {
        asPath,
        query: { tx },
    } = useRouter() as QueryRouter<{ tx?: string }>;
    const { setCCDWallet, deleteCCDWallet } = useCCDWalletStore();

    useEffect(() => {
        detectConcordiumProvider()
            .then((p) => {
                p.on("accountChanged", setCCDWallet);
                p.on("accountDisconnected", deleteCCDWallet);
                p.on("chainChanged", (c) => {
                    if (c !== network.ccd.genesisHash) {
                        deleteCCDWallet();
                    }
                });

                return p.getMostRecentlySelectedAccount();
            })
            .then((a) => {
                if (a !== undefined) {
                    setCCDWallet(a);
                }
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Shows whether user is on withdraw progress page, in which case we should NOT watch for pending withdrawals
     */
    const isWithdrawProgressRoute = useMemo(() => tx !== undefined && asPath === routes.withdraw.tx(tx), [asPath, tx]);

    const appContextValue: AppContext = useMemo(() => ({ isTablet, isMobile }), [isTablet, isMobile]);

    return (
        <appContext.Provider value={appContextValue}>
            <Web3Provider connectors={connectors} libraryName="ethers.js">
                <GlobalStyles />
                <QueryClientProvider client={queryClient}>
                    {isWithdrawProgressRoute || <WatchWithdrawals />}
                    <Layout>
                        <Component {...pageProps} />
                    </Layout>
                </QueryClientProvider>
            </Web3Provider>
        </appContext.Provider>
    );
}

export default MyApp;
