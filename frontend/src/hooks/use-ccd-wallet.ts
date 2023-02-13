import { useCallback, useEffect } from "react";
import detectCcdProvider from "src/helpers/detectCcdProvider";
import useCCDWalletStore from "src/store/ccd-wallet/ccdWalletStore";

// local storage wording:
// Cornucopia_${chainName}_state

const useCCDWallet = () => {

    const ccdContext = useCCDWalletStore(state => state.ccdContext)
    const setCCDWallet = useCCDWalletStore(state => state.setCCDWallet)
    const deleteCCDWallet = useCCDWalletStore(state => state.deleteCCDWallet)

    const connectCCD = useCallback(async () => {
        detectCcdProvider()
            .then((provider) => provider.connect())
            .then((accAddress) => { if (accAddress) { setCCDWallet(accAddress) } })
            .then(() => {
                detectCcdProvider()
                    // Check if the user is connected to testnet by checking if the testnet genesisBlock exists.
                    // Throw a warning and disconnect if not. We only want to
                    // allow users to interact with our testnet smart contracts.
                    .then((provider) =>
                        provider
                            .getJsonRpcClient()
                            .getCryptographicParameters(process.env.NEXT_PUBLIC_TESTNET_GENESIS_BLOCK_HASH.toString())
                            .then((result) => {
                                if (result === undefined || result?.value === null) {
                                    deleteCCDWallet()
                                    console.error(
                                        'Your JsonRpcClient in the Concordium browser wallet cannot connect. Check if your Concordium browser wallet is connected to testnet!'
                                    );
                                }
                            })
                    );
            })
            .catch(() => {
                console.error(
                    'Your JsonRpcClient in the Concordium browser wallet cannot connect. Check if your Concordium browser wallet is connected to testnet!'
                );
                deleteCCDWallet()
            });

        localStorage["CCP_CCD_connected"] = true;
    }, [])

    const disconnectCCD = async () => {
        deleteCCDWallet()
        delete localStorage["CCP_CCD_connected"];
    };

    // useEffect(() => {
    //     // Listen for relevant events from the wallet.
    //     detectCcdProvider()
    //         .then((provider) => {
    //             provider.on('chainChanged', (genesisBlock) => {
    //                 // Check if the user is connected to testnet by checking if the genesisBlock is the testnet one.
    //                 // Throw a warning and disconnect if wrong chain. We only want to
    //                 // allow users to interact with our testnet smart contracts.
    //                 if (genesisBlock !== process.env.NEXT_PUBLIC_TESTNET_GENESIS_BLOCK_HASH) {
    //                     window.alert('Check if your Concordium browser wallet is connected to testnet!');
    //                     disconnectCCD();
    //                 }
    //             });

    //             provider.on('accountChanged', (accAddress) => { setCCDWallet(accAddress); });
    //             provider.on('accountDisconnected', disconnectCCD);
    //         })
    //         .catch(() => disconnectCCD());

    //     return () => {
    //         detectCcdProvider().then(provider => provider.removeAllListeners())
    //     }
    // }, []);

    // useEffect(() => {
    //     if (localStorage["CCP_CCD_connecting"] === true) return;

    //     if (localStorage["CCP_CCD_connected"]) {
    //         try {
    //             localStorage["CCP_CCD_connecting"] = true;
    //             connectCCD().then(() => {
    //                 delete localStorage["CCP_CCD_connecting"];
    //             });
    //         } catch (error) {
    //             delete localStorage["CCP_CCD_connected"];
    //             delete localStorage["CCP_CCD_connecting"];
    //         }
    //     }
    // }, [ccdContext]);

    return {
        ccdContext,
        connectCCD,
        disconnectCCD,
    };
};

export default useCCDWallet;
