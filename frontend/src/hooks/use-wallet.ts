import { ethers } from "ethers";
import { useEffect } from "react";
import { useWeb3Context } from "web3-react";

const defaultChain = 5; //5 for goerli test network

// local storage wording:
// Cornucopia_${chainName}_state

const useWallet = () => {
    const context = useWeb3Context();

    const connect = async () => {
        if (!context.active) {
            context.unsetConnector();
        }
        context.setConnector("MetaMask");
        localStorage["CCP_ETH_connected"] = true;
    };

    const disconnect = async () => {
        context.unsetConnector();
        delete localStorage["CCP_ETH_connected"];
    };

    const getNativeBalance = async () => {
        if (!context.account) throw new Error("You must be signed in with wallet");

        const balance = await context.library?.getBalance(context.account);

        if (!balance) return;

        return ethers.utils.formatEther(balance);
    };

    const changeChain = async (chainId: string) => {
        await (window as any)?.ethereum?.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainId }], // chainId must be in hexadecimal numbers
        });
    };

    // ASK CHAIN CHANGE IF CHAIN IS WRONG
    useEffect(() => {
        if (context.networkId !== defaultChain) {
            changeChain(`0x${defaultChain.toString(16)}`);
        }
    }, [context.networkId]);

    // CONNECTING TO ACCOUNT
    useEffect(() => {
        if (!context.active && !context.error) {
            // loading
        } else if (context.error) {
            //error
        } else {
            // success
        }
    }, [context]);

    useEffect(() => {
        if (localStorage["CCP_ETH_connecting"] === true) return;

        if (localStorage["CCP_ETH_connected"] && !context.account) {
            try {
                localStorage["CCP_ETH_connecting"] = true;
                connect().then(() => {
                    delete localStorage["CCP_ETH_connecting"];
                });
            } catch (error) {
                delete localStorage["CCP_ETH_connected"];
                delete localStorage["CCP_ETH_connecting"];
            }
        }
    }, [context]);

    return {
        context,
        connect,
        disconnect,
        getNativeBalance,
    };
};

export default useWallet;
