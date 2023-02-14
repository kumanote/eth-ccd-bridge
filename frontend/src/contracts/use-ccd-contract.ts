import {
    AccountAddress,
    AccountTransactionType,
    CcdAmount,
    ContractAddress,
    HttpProvider,
    JsonRpcClient,
    TransactionExpiry,
    UpdateContractPayload,
} from "@concordium/common-sdk";
import { calculateEnergyCost, serializeUpdateContractParameters } from "@concordium/web-sdk";
import addresses from "@config/addresses";
import contractNames from "@config/contractNames";
import { bridgeManager, cis2Bridgeable } from "@config/schemas";
import leb from "leb128";
import { Buffer } from "buffer/index";
import { ethers } from "ethers";
import { Components } from "src/api-query/__generated__/AxiosClient";
import decodeOperatorOf from "src/helpers/decodeOperatorOf";
import detectCcdProvider from "src/helpers/detectCcdProvider";
import hexToBase64 from "src/helpers/hexToBase64";

const useCCDContract = (ccdAccount: string | null, enabled: boolean) => {
    const bridgeManagerContract = {
        index: BigInt(addresses.bridgeManagerIndex),
        subindex: BigInt(0),
    } as ContractAddress;

    const approve = async (ccdToken: Components.Schemas.CcdToken, energy?: number) => {
        if (!ccdAccount || !enabled) {
            throw new Error("No account available");
        }

        if (!energy) {
            throw new Error("Energy is undefined");
        }

        const maxContractExecutionEnergy = BigInt(Math.ceil((energy * 10 ** (ccdToken.decimals / 2)) / 100) * 100);

        const contractAddress = {
            index: BigInt(ccdToken.contract_index),
            subindex: BigInt(ccdToken.contract_subindex),
        } as ContractAddress;

        const receiveName = `${contractNames.cis2Bridgeable}.updateOperator`;

        const rawSchema = hexToBase64(cis2Bridgeable);

        const provider = await detectCcdProvider();

        const userInput = [
            {
                update: {
                    Add: [],
                },
                operator: {
                    Contract: [
                        {
                            index: +addresses.bridgeManagerIndex,
                            subindex: 0,
                        },
                    ],
                },
            },
        ];

        const txHash = await provider.sendTransaction(
            ccdAccount,
            AccountTransactionType.Update,
            {
                amount: new CcdAmount(BigInt(0)),
                address: contractAddress,
                receiveName: receiveName,
                maxContractExecutionEnergy: maxContractExecutionEnergy,
            } as UpdateContractPayload,
            userInput as any,
            rawSchema,
            2
        );

        return { result: !!txHash, hash: txHash };
    };

    const withdraw = async function (
        amount: string,
        ccdToken?: Components.Schemas.CcdToken,
        ethAddress?: string,
        energy?: number
    ): Promise<{ result: boolean; hash: string } | undefined> {
        if (!ccdAccount || !enabled) {
            throw new Error("No account available");
        }

        if (!ccdToken) {
            throw new Error("ccdToken is undefined");
        }
        if (!ethAddress) {
            throw new Error("ETH address is undefined");
        }
        // if (!energy) {
        //   throw new Error("Energy is undefined");
        // }

        // const maxContractExecutionEnergy = BigInt(
        //   Math.ceil((energy * 10 ** (ccdToken.decimals / 2)) / 100) * 100
        // );

        const maxContractExecutionEnergy = BigInt(30000);

        const receiveName = `${contractNames.bridgeManager}.withdraw`;

        const parsedAmount = parseInt((Number(amount) * 10 ** ccdToken.decimals).toString());

        const rawSchema = hexToBase64(bridgeManager);

        const provider = await detectCcdProvider();

        const txHash = await provider.sendTransaction(
            ccdAccount,
            AccountTransactionType.Update,
            {
                amount: new CcdAmount(BigInt(0)),
                address: bridgeManagerContract,
                receiveName: receiveName,
                maxContractExecutionEnergy: maxContractExecutionEnergy,
            } as UpdateContractPayload,
            {
                eth_address: Array.from(ethers.utils.arrayify(ethAddress)),
                amount: parsedAmount.toString(),
                token: {
                    index: ccdToken.contract_index,
                    subindex: ccdToken.contract_subindex,
                },
                token_id: "0000000000000000",
            },
            rawSchema,
            2
        );

        return { result: !!txHash, hash: txHash };
    };

    const getTransactionStatus = async (hash: string) => {
        const provider = detectCcdProvider();

        const tx = await (await provider).getJsonRpcClient().getTransactionStatus(hash);

        return tx;
    };

    const balanceOf = async function (ccdToken?: Components.Schemas.CcdToken): Promise<number> {
        if (!ccdToken) {
            throw new Error("ccdToken is undefined");
        }

        const param = serializeUpdateContractParameters(
            contractNames.cis2Bridgeable,
            "balanceOf",
            [
                {
                    address: {
                        Account: [ccdAccount],
                    },
                    token_id: "",
                },
            ],
            Buffer.from(hexToBase64(cis2Bridgeable), "base64")
        );

        const provider = await detectCcdProvider();
        const res = await provider.getJsonRpcClient().invokeContract({
            method: `${contractNames.cis2Bridgeable}.balanceOf`,
            contract: {
                index: BigInt(ccdToken.contract_index),
                subindex: BigInt(ccdToken.contract_subindex),
            },
            parameter: param,
        });
        if (!res || res.tag === "failure" || !res.returnValue) {
            throw new Error(
                `RPC call 'invokeContract' on method '${contractNames.cis2Bridgeable}.balanceOf' of contract '${ccdToken.contract_index}' failed`
            );
        }

        // The return value is an array. The value stored in the array starts at position 4 of the return value.
        const balanceOf = BigInt(leb.unsigned.decode(Buffer.from(res.returnValue.slice(4), "hex")));

        // if it has 18 decimals, use ether util for precision
        return ccdToken.decimals !== 18
            ? +balanceOf.toString() / 10 ** ccdToken.decimals
            : +ethers.utils.formatEther(balanceOf.toString());
    };

    const hasApprove = async (ccdTokenAddress?: { index?: number; subindex?: number }) => {
        if (!enabled || !ccdAccount) return;

        if (!ccdTokenAddress?.index || (!ccdTokenAddress?.subindex && ccdTokenAddress?.subindex !== 0)) {
            throw new Error("ccdTokenAddress is undefined");
        }

        const provider = await detectCcdProvider();

        const userInput = [
            {
                owner: {
                    Account: [ccdAccount],
                },
                address: {
                    Contract: [
                        {
                            index: +addresses.bridgeManagerIndex,
                            subindex: 0,
                        },
                    ],
                },
            },
        ];

        // calculateEnergyCost
        // https://github.dev/Concordium/concordium-browser-wallet/blob/main/packages/browser-wallet/src/popup/pages/SendTransaction/SendTransaction.tsx#L83

        const moduleFileBuffer = Buffer.from(cis2Bridgeable, "hex");

        const params = serializeUpdateContractParameters(
            contractNames.cis2Bridgeable,
            "operatorOf",
            userInput,
            moduleFileBuffer
        );

        console.log(userInput, params);

        const res = await provider.getJsonRpcClient().invokeContract({
            invoker: new AccountAddress(ccdAccount),
            contract: {
                index: BigInt(ccdTokenAddress.index),
                subindex: BigInt(ccdTokenAddress.subindex),
            },
            amount: new CcdAmount(BigInt(0)),
            method: `${contractNames.cis2Bridgeable}.operatorOf`,
            parameter: params,
            energy: BigInt(30000),
        });

        console.log("res", res);

        const isApproved = decodeOperatorOf((res as any).returnValue);

        console.log("isApproved", isApproved);

        return isApproved;
    };

    const getLatestFinalizedBlock = async function () {
        const provider = await detectCcdProvider();

        const res = await provider.getJsonRpcClient().getConsensusStatus();

        return res.lastFinalizedBlock;
    };

    const estimateWithdraw = async (amount: string, ccdToken?: Components.Schemas.CcdToken, ethAddress?: string) => {
        if (!enabled || !ccdAccount) return;

        if (!ccdToken) {
            throw new Error("ccdToken is undefined");
        }
        if (!ethAddress) {
            throw new Error("ETH address is undefined");
        }

        const provider = await detectCcdProvider();

        const parsedAmount = parseInt((Number(amount) * 10 ** ccdToken.decimals).toString());

        const userInput = {
            eth_address: Array.from(ethers.utils.arrayify(ethAddress)),
            amount: parsedAmount.toString(),
            token: {
                index: ccdToken.contract_index,
                subindex: ccdToken.contract_subindex,
            },
            token_id: "0000000000000000",
        };

        const moduleFileBuffer = Buffer.from(hexToBase64(bridgeManager), "base64");

        const params = serializeUpdateContractParameters(
            contractNames.bridgeManager,
            "withdraw",
            userInput,
            moduleFileBuffer
        );

        const res = await provider.getJsonRpcClient().invokeContract({
            invoker: new AccountAddress(ccdAccount),
            contract: bridgeManagerContract,
            method: `${contractNames.bridgeManager}.withdraw`,
            amount: undefined,
            parameter: params,
            energy: BigInt(30000),
        });

        if (!res || res.tag === "failure" || !res.returnValue) {
            throw new Error(
                `RPC call 'invokeContract' on method '${contractNames.bridgeManager}.withdraw' of contract '${
                    bridgeManagerContract.index
                }' failed with rejectReason ${(res as any)?.reason?.rejectReason}`
            );
        }

        const parsedResult = Number(res?.usedEnergy.toString()) / 10 ** (ccdToken.decimals / 2); //energy to ccd

        const estimateCcd = +(parsedResult + 0.4 * parsedResult).toFixed(4); //add 40% of the result

        return estimateCcd;
    };

    const estimateApprove = async (ccdToken?: Components.Schemas.CcdToken) => {
        if (!enabled || !ccdAccount) return;

        if (!ccdToken) {
            throw new Error("ccdToken is undefined");
        }

        const provider = await detectCcdProvider();

        const contractAddress = {
            index: BigInt(ccdToken.contract_index),
            subindex: BigInt(ccdToken.contract_subindex),
        };

        const moduleFileBuffer = Buffer.from(hexToBase64(cis2Bridgeable), "base64");

        const userInput = [
            {
                update: {
                    Add: {},
                },
                operator: {
                    Contract: [
                        {
                            index: ccdToken?.contract_index,
                            subindex: ccdToken?.contract_subindex,
                        },
                    ],
                },
            },
        ];

        const params = serializeUpdateContractParameters(
            `${contractNames.cis2Bridgeable}`,
            "updateOperator",
            userInput,
            moduleFileBuffer
        );

        const res = await provider.getJsonRpcClient().invokeContract({
            invoker: new AccountAddress(ccdAccount),
            contract: contractAddress,
            method: `${contractNames.cis2Bridgeable}.updateOperator`,
            amount: undefined,
            parameter: params,
            energy: BigInt(30000),
        });

        const parsedResult = Number(res?.usedEnergy.toString()) / 10 ** (ccdToken.decimals / 2); //energy to ccd

        const estimateCcd = +(parsedResult + 0.4 * parsedResult); //add 40% of the result

        return estimateCcd;
    };

    return {
        approve,
        withdraw,
        getTransactionStatus,
        balanceOf,
        hasApprove,
        getLatestFinalizedBlock,
        estimateWithdraw,
        estimateApprove,
    };
};

export default useCCDContract;
