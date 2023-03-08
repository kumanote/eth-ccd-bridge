import { ethers } from "ethers";

/**
 *
 * @param amount
 * @returns {weiAmount in string}
 */
export const toWei = (amount: string): string => ethers.utils.parseEther(amount).toString();

export const formatAmount = (decimalNumber: string) => Math.round(+decimalNumber * 1e4) / 1e4;
