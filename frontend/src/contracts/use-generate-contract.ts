import addresses from "@config/addresses";
import { ethers } from "ethers";
import { toWei } from "../helpers/number";
import useWallet from "../hooks/use-wallet";
import MOCK_ABI from "./abis/MOCK_ABI.json";

const useGenerateContract = (address: string, enabled: boolean) => {
  const { context } = useWallet();
  const amountToApprove = toWei("1000000000000");

  const getBalance = async (decimals: number) => {
    if (!enabled || !address || !context.library) return;
    const provider = context.library;

    let balance;

    if (address === addresses.eth) {
      balance = await provider.getBalance(context.account!);
    } else {
      const generatedContract = new ethers.Contract(
        address,
        MOCK_ABI,
        provider
      );
      balance = await generatedContract.balanceOf(context.account);
    }

    if (decimals === 18) {
      return Number(ethers.utils.formatEther(balance));
    } else {
      return balance / 10 ** decimals;
    }
  };

  const allowance = async (erc20PredicateAddress: string) => {
    if (!enabled || !erc20PredicateAddress || !address || !context.library)
      return;
    const signer = context.library?.getSigner();

    const generatedContract = new ethers.Contract(address, MOCK_ABI, signer);

    const allowance = await generatedContract.allowance(
      // Owner
      context.account,
      // Spender
      erc20PredicateAddress
    );

    return allowance;
  };

  const approve = async (erc20PredicateAddress: string) => {
    if (!enabled || !erc20PredicateAddress! || !address || !context.library)
      return;
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

  const checkAllowance = async (erc20PredicateAddress: string) => {
    if (!enabled || !erc20PredicateAddress) return;
    const allowResponse = await allowance(erc20PredicateAddress);

    // DID USER APPROVE ALLOWANCE?
    if (allowResponse._hex === "0x00") {
      try {
        const tx = await approve(erc20PredicateAddress);
        return tx;
      } catch (err) {
        throw new Error("You need to approve token spending");
      }
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
