import { ethers } from "ethers";
import addresses from "../config/addresses";
import { toWei } from "../helpers/number";
import useWallet from "../hooks/use-wallet";
import WETH_ABI from "./abis/WETH_ABI.json";

const useWethContract = () => {
  const { context } = useWallet();
  const wethBalance = toWei("1000000000000");

  const getBalance = async () => {
    const provider = context.library;

    const wethContract = new ethers.Contract(
      addresses.weth,
      WETH_ABI,
      provider
    );

    const balance = await wethContract.balanceOf(context.account);

    return ethers.utils.formatEther(balance);
  };

  const estimateGas = async (address: string, amount: number) => {
    const provider = context.library;

    const wethContract = new ethers.Contract(
      addresses.weth,
      WETH_ABI,
      provider
    );

    const gasLimit = (
      await wethContract.estimateGas.transfer(address, amount.toString())
    ).toNumber();
    const gasPrice = (await provider?.getGasPrice())?.toNumber();

    if (!gasPrice) return;

    const estimatedGasPrice = gasPrice * gasLimit;

    return ethers.utils.formatEther(estimatedGasPrice);
  };

  const allowance = async (
    address: string = "0x05f7c98458440b626d345510f0144686b34ccE48"
  ) => {
    const signer = context.library?.getSigner();

    const wethContract = new ethers.Contract(addresses.weth, WETH_ABI, signer);

    const allowance = await wethContract.allowance(
      // Owner
      context.account,
      // Spender
      address
    );

    return allowance;
  };

  const approve = async (
    address: string = "0x05f7c98458440b626d345510f0144686b34ccE48"
  ) => {
    const signer = context.library?.getSigner();

    const wethContract = new ethers.Contract(addresses.weth, WETH_ABI, signer);

    const approve = await wethContract.approve(
      // Spender
      address,
      // Amount
      wethBalance
    );

    return approve;
  };

  const checkAllowance = async (address: string) => {
    const allowResponse = await allowance(address);

    // DID USER APPROVE ALLOWANCE?
    if (allowResponse._hex === "0x00") {
      try {
        await approve(address);
      } catch (err) {
        throw new Error("You need to approve wETH spending");
      }
    }
  };

  return {
    allowance,
    approve,
    estimateGas,
    getBalance,
    checkAllowance,
  };
};

export default useWethContract;
