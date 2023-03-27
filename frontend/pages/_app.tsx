import Layout from "@components/organisms/layout/Layout";
import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
import connectors from "@config/connectors";
import network from "@config/network";
import useCCDWallet from "@hooks/use-ccd-wallet";
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

function UseConcordiumEvents() {
    const { refreshMostRecentlySelectedAccount } = useCCDWallet();
    const { setNetworkMatch, setWallet, deleteWallet } = useCCDWalletStore();

    // Sets up event handlers once, globally.
    useEffect(() => {
        detectConcordiumProvider().then((p) => {
            p.on("accountChanged", setWallet);
            p.on("accountDisconnected", () => {
                deleteWallet();
            });
            p.on("chainChanged", (c) => {
                // There is a bug in the browser wallet not properly triggering this
                // if no account in the wallet is connected to the dapp for the network selected.
                // As such, this is unreliable for now.
                if (c === network.ccd.genesisHash) {
                    setNetworkMatch();
                    refreshMostRecentlySelectedAccount();
                } else {
                    deleteWallet(true);
                }
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}

function MyApp({ Component, pageProps }: AppProps) {
    const isTablet = useMediaQuery("(max-width: 1050px)"); // res at which cornucopia logo might touch the modal
    const isMobile = useMediaQuery("(max-width: 540px)"); // res at which the design looks a little weird
    const {
        asPath,
        query: { tx },
    } = useRouter() as QueryRouter<{ tx?: string }>;

    UseConcordiumEvents();

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
