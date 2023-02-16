import Layout from "@components/organisms/layout/Layout";
import connectors from "@config/connectors";
import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "react-query";
import GlobalStyles from "src/theme/global";
import Web3Provider from "web3-react";
import "../styles/globals.css";

const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <Web3Provider connectors={connectors} libraryName="ethers.js">
            <GlobalStyles />
            <QueryClientProvider client={queryClient}>
                <Layout>
                    <Component {...pageProps} />
                </Layout>
            </QueryClientProvider>
        </Web3Provider>
    );
}

export default MyApp;
