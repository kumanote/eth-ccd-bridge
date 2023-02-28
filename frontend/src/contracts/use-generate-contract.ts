import addresses from "@config/addresses";
import { BigNumber, ContractTransaction, ethers } from "ethers";
import { toWei } from "../helpers/number";
import useWallet from "../hooks/use-wallet";
import MOCK_ABI from "./abis/MOCK_ABI.json";

const ERC20_ALLOWANCE = "1000000000000";

const useGenerateContract = (address: string, enabled: boolean) => {
    const { context } = useWallet();
    const amountToApprove = toWei(ERC20_ALLOWANCE);

    const getBalance = async (decimals: number) => {
        if (!enabled || !address || !context.library) return;
        const provider = context.library;

        let balance;

        if (address === addresses.eth) {
            balance = await provider.getBalance(context.account!);
        } else {
            const generatedContract = new ethers.Contract(address, MOCK_ABI, provider);
            balance = await generatedContract.balanceOf(context.account);
        }

        if (decimals === 18) {
            return Number(ethers.utils.formatEther(balance));
        } else {
            return balance / 10 ** decimals;
        }
    };

    const allowance = async (erc20PredicateAddress: string): Promise<BigNumber> => {
        if (!enabled || !erc20PredicateAddress || !address || !context.library) {
            throw new Error("Expected necessary parameters to be available");
        }

        const signer = context.library?.getSigner();
        const generatedContract = new ethers.Contract(address, MOCK_ABI, signer);

        return await generatedContract.allowance(
            // Owner
            context.account,
            // Spender
            erc20PredicateAddress
        );
    };

    const approve = async (erc20PredicateAddress: string) => {
        if (!enabled || !erc20PredicateAddress! || !address || !context.library) return;
        const signer = context.library?.getSigner();

        const generatedContract = new ethers.Contract(address, MOCK_ABI, signer);

        const approve = await generatedContract.approve(
            // Spender
            erc20PredicateAddress,
            // Amount
            amountToApprove
        );
        return approve;
    };

    /**
     * Returns `ContractTransaction` or undefined if allowance has already been given.
     * Throws if necessary parameters are not available when function is invoked.
     */
    const checkAllowance = async (
        erc20PredicateAddress: string,
        onRequireApproval?: () => void
    ): Promise<ContractTransaction | undefined> => {
        if (!enabled || !erc20PredicateAddress) {
            throw new Error("Expected necessary parameters to be available");
        }
        const allowResponse = await allowance(erc20PredicateAddress);

        if (allowResponse._hex !== "0x00") {
            // Allowance has already been given
            return undefined;
        }

        try {
            onRequireApproval?.();
            return await approve(erc20PredicateAddress);
        } catch (err) {
            throw new Error("You need to approve token spending");
        }
    };

    return {
        allowance,
        approve,
        getBalance,
        checkAllowance,
    };
};

export default useGenerateContract;
