import { ethers } from "ethers";

/**
 * Ether value to decimal
 *
 * @param {ethers.BigNumberish} amount
 * @param {decimals} decimals
 *
 * @returns {decimal} amount
 */
export const formatUnits = (amount: ethers.BigNumberish, decimals = 18): number =>
    parseFloat(ethers.utils.formatUnits(amount, decimals));

/**
 *
 * @param amount
 * @returns {weiAmount in string}
 */
export const toWei = (amount: string): string => ethers.utils.parseEther(amount).toString();
