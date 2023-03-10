import network from "@config/network";
import { ethers } from "ethers";
import { useEffect } from "react";
import { useWeb3Context } from "web3-react";

const CHAIN_ID = Number(network.eth.id);

// local storage wording:
// Cornucopia_${chainName}_state

const useEthWallet = () => {
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
        await window?.ethereum?.request?.({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainId }], // chainId must be in hexadecimal numbers
        });
    };

    // ASK CHAIN CHANGE IF CHAIN IS WRONG
    useEffect(() => {
        if (context.networkId !== CHAIN_ID) {
            changeChain(`0x${CHAIN_ID.toString(16)}`);
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

    return {
        context,
        connect,
        disconnect,
        getNativeBalance,
    };
};

export default useEthWallet;
