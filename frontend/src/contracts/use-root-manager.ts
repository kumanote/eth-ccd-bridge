import { ethers } from "ethers";
import { toWei } from "../helpers/number";
import useWallet from "../hooks/use-wallet";
import ROOTMANAGER_ABI from "./abis/ROOTMANAGER_ABI.json";
import bs58check from "bs58check";
import addresses from "@config/addresses";
import { Components } from "src/api-query/__generated__/AxiosClient";

const useRootManagerContract = (ccdAccount: string | null, enabled: boolean) => {
    const { context } = useWallet();

    const ccdUser = enabled
        ? "0x" + Buffer.from(Uint8Array.prototype.slice.call(bs58check.decode(ccdAccount || ""), 1)).toString("hex")
        : "";

    const typeToVault = async () => {
        if (!context.library || !enabled) return "";

        const signer = context.library.getSigner();

        const rootContract = new ethers.Contract(addresses.root, ROOTMANAGER_ABI, signer);

        const typeToVault = await rootContract.typeToVault(
            process.env.NEXT_PUBLIC_GENERATE_ETHER_PREDICATE_ADDRESS //address to generate the predicate address
        );

        return typeToVault;
    };

    const depositFor = async (amount: string, selectedToken: Components.Schemas.TokenMapItem) => {
        if (!context.library || !enabled || !ccdUser) return;
        const signer = context.library.getSigner();

        const rootContract = new ethers.Contract(addresses.root, ROOTMANAGER_ABI, signer);

        let parsedAmount;

        if (selectedToken.decimals === 18) {
            parsedAmount = toWei(amount);
        } else {
            parsedAmount = Number(amount) * 10 ** selectedToken.decimals;
        }

        const depositData = ethers.utils.defaultAbiCoder.encode(["uint256"], [parsedAmount]);

        const depositFor = await rootContract.depositFor(
            context.account,
            ccdUser,
            selectedToken.eth_address,
            depositData
        );

        return depositFor;
    };

    const depositEtherFor = async (amount: string) => {
        if (!context.library || !enabled || !ccdUser) return;
        const signer = context.library.getSigner();

        console.log("ccdUser", ccdUser);

        const rootContract = new ethers.Contract(addresses.root, ROOTMANAGER_ABI, signer);

        const depositEtherFor = await rootContract.depositEtherFor(context.account, ccdUser, { value: toWei(amount) });
        return depositEtherFor;
    };

    const withdraw = async (params: Components.Schemas.WithdrawParams, proof: string) => {
        if (!context.library) return;
        const signer = context.library.getSigner();

        const rootContract = new ethers.Contract(addresses.root, ROOTMANAGER_ABI, signer);

        const partsLength = proof.length / 64;
        const parts = [];
        for (let i = 0; i < partsLength; i++) {
            parts.push("0x" + proof.substring(i * 64, (i + 1) * 64));
        }

        const parsedParams = {
            ccdIndex: params.ccd_index,
            ccdSubIndex: params.ccd_sub_index,
            amount: params.amount,
            userWallet: params.user_wallet,
            ccdTxHash: params.ccd_tx_hash,
            ccdEventIndex: params.ccd_event_index,
            tokenId: params.token_id,
        };

        const withdraw = await rootContract.withdraw(parsedParams, parts);

        return withdraw;
    };

    const estimateGas = async (
        amount: string,
        selectedToken: Components.Schemas.TokenMapItem,
        type: "deposit" | "withdraw",
        params?: Components.Schemas.WithdrawParams,
        proof?: string
    ) => {
        if (!context.library) return;
        const provider = context.library.getSigner();

        const rootContract = new ethers.Contract(addresses.root, ROOTMANAGER_ABI, provider);

        let gasLimit;

        let parsedAmount;

        if (type === "deposit") {
            if (selectedToken.eth_address === addresses.eth) {
                console.log("depositEtherFor estimate", ccdUser);
                gasLimit = (
                    await rootContract.estimateGas.depositEtherFor(context.account, ccdUser, { value: toWei(amount) })
                ).toNumber();
            } else {
                if (selectedToken.decimals === 18) {
                    parsedAmount = toWei(amount);
                } else {
                    parsedAmount = Number(amount) * 10 ** selectedToken.decimals;
                }
                const depositData = ethers.utils.defaultAbiCoder.encode(["uint256"], [parsedAmount]);

                gasLimit = (
                    await rootContract.estimateGas.depositFor(
                        context.account,
                        ccdUser,
                        selectedToken.eth_address,
                        depositData
                    )
                ).toNumber();
            }
        } else {
            const partsLength = proof!.length / 64;
            const parts = [];
            for (let i = 0; i < partsLength; i++) {
                parts.push("0x" + proof!.substring(i * 64, (i + 1) * 64));
            }

            const parsedParams = {
                ccdIndex: params!.ccd_index,
                ccdSubIndex: params!.ccd_sub_index,
                amount: params!.amount,
                userWallet: params!.user_wallet,
                ccdTxHash: params!.ccd_tx_hash,
                ccdEventIndex: params!.ccd_event_index,
                tokenId: params!.token_id,
            };

            gasLimit = (await rootContract.estimateGas.withdraw(parsedParams, parts)).toNumber();
        }

        const gasPrice = (await provider?.getGasPrice())?.toNumber();

        if (!gasPrice) {
            throw new Error("Error getting gas price");
        }

        const estimatedGasPrice = gasPrice * gasLimit;

        return Number(ethers.utils.formatEther(estimatedGasPrice)).toFixed(7);
    };

    return {
        ccdUser,
        typeToVault,
        depositFor,
        depositEtherFor,
        withdraw,
        estimateGas,
    };
};

export default useRootManagerContract;
