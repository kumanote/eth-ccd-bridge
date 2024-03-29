import network from "@config/network";
import { ethers } from "ethers";
import { useCallback, useEffect } from "react";
import { useWeb3Context } from "web3-react";
import detectEthereumProvider from "@metamask/detect-provider";
import { useAsyncMemo } from "./utils";
import { noOp } from "src/helpers/basic";

const CHAIN_ID = Number(network.eth.id);

let hasInitialised = false;
const useEthWallet = () => {
    const context = useWeb3Context();
    const provider = useAsyncMemo(detectEthereumProvider, noOp, []);

    const connect = useCallback(async () => {
        if (context.networkId !== CHAIN_ID) {
            await changeChain(`0x${CHAIN_ID.toString(16)}`);
        }

        if (!context.active) {
            try {
                await context.setConnector("MetaMask", { suppressAndThrowErrors: true });
            } catch (e) {
                context.unsetConnector();
            }
        }
    }, [context]);

    const disconnect = useCallback(async () => {
        context.unsetConnector();
        delete localStorage["CCP_ETH_connected"];
    }, [context]);

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

    const init = useCallback(async () => {
        if (context.active) {
            return;
        }

        const accounts = await window.ethereum?.request?.({ method: "eth_accounts" });
        if (accounts?.length) {
            await context.setConnector("MetaMask");
        }
    }, [context]);

    useEffect(() => {
        if (provider !== undefined && !hasInitialised) {
            init();
            hasInitialised = true;
        }
    }, [provider, init]);

    useEffect(() => {
        if (context.active && !context.error) {
            localStorage["CCP_ETH_connected"] = true;
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
