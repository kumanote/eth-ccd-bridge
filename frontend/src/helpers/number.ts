import { ethers } from "ethers";
import { round } from "wallet-common-helpers/lib/utils/numberStringHelpers";

/**
 *
 * @param amount
 * @returns {weiAmount in string}
 */
export const toWei = (amount: string): string => ethers.utils.parseEther(amount).toString();

export const formatAmount = round(4);
export const tokenDecimalsToResolution = (decimals: number) => BigInt("1".padEnd(decimals + 1, "0")); // Nextjs compiler translates `**` to `Math.pow` even for bigints....
