import type { NextPage } from "next";
import TransferOverview from "@components/templates/transfer-overview";
import { Components } from "src/api-query/__generated__/AxiosClient";
import { ContractTransaction } from "ethers";
import addresses from "@config/addresses";
import useCCDWallet from "@hooks/use-ccd-wallet";
import useRootManagerContract from "src/contracts/use-root-manager";
import { routes } from "src/constants/routes";
import useGenerateContract from "src/contracts/use-generate-contract";
import { usePreSubmitStore } from "src/store/pre-submit";

const WithdrawOverview: NextPage = () => {
    const { ccdContext } = useCCDWallet();
    const { amount, token: selectedToken } = usePreSubmitStore();
    const { checkAllowance } = useGenerateContract(
        selectedToken?.eth_address as string, // address or empty string because the address is undefined on first renders
        !!selectedToken && !!amount // plus it's disabled on the first render anyway
    );
    const { typeToVault, depositFor, depositEtherFor, estimateGas } = useRootManagerContract(
        ccdContext.account,
        !!ccdContext.account
    );

    /**
     * Gets the gas fee required to make the deposit.
     * Throws `Error` if user rejected in the ethereum wallet
     */
    const getGasFee = async (): Promise<number> => {
        if (!amount || !selectedToken) {
            throw new Error("Epxected dependencies to be available");
        }

        try {
            if (selectedToken.eth_address !== addresses.eth) {
                const erc20PredicateAddress = await typeToVault(); //generate predicate address
                // try to check the allowance of the token (else you can't estimate gas)
                const tx = await checkAllowance(erc20PredicateAddress);

                if (tx) {
                    // if the tx is returned, the allowance was approved
                    // wait for the confirmation of approve()
                    // and estimate the gas
                    await tx.wait(1);
                }
            }

            const gas = await estimateGas(amount, selectedToken, "deposit");
            return parseFloat(gas as string);
        } catch (error: any) {
            // TODO: remove...
            console.error("gas reason:", error);

            // else, the user did not approve or doesn't have enought tokens and we see the error
            if (error?.reason) {
                throw new Error(error?.reason);
            } else {
                throw error;
            }
        }
    };

    /**
     * Handles submission of the deposit transaction.
     */
    const onSubmit = async (
        token: Components.Schemas.TokenMapItem,
        amount: string,
        setError: (message: string) => void
    ): Promise<string | undefined> => {
        try {
            let tx: ContractTransaction;
            if (token.eth_address === addresses.eth) {
                // when depositing ether, we don't need to check allowance
                tx = await depositEtherFor(amount);
            } else {
                const erc20PredicateAddress = await typeToVault(); //generate predicate address
                await checkAllowance(erc20PredicateAddress); //check allowance for that address
                tx = await depositFor(amount, token); //deposit
            }

            await tx.wait(1); // wait for confirmed transaction
            // TODO: set a status message to let the user know what they're waiting for...

            return routes.deposit.tx(tx.hash);
        } catch (error: any) {
            // TODO: remove
            console.dir("Deposit error:", error);

            if (error.message.includes("ACTION_REJECTED")) {
                setError("Transaction was rejected.");
            } else {
                setError(error.message);
            }
        }
    };

    return <TransferOverview handleSubmit={onSubmit} requestGasFee={getGasFee} />;
};

export default WithdrawOverview;
