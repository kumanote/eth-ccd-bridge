import { toFraction } from "wallet-common-helpers/lib/utils/numberStringHelpers";

const MICRO_CCD_PER_CCD = 1000000n;

const microCcdToCcd = toFraction(MICRO_CCD_PER_CCD);

export const renderGasFeeEstimate = (fee: number, ethPrice: number): string =>
    `~${fee.toFixed(4)} ETH (${(fee * ethPrice).toFixed(4)} USD)`;

export const renderEnergyFeeEstimate = (microCcdFee: bigint, ccdPrice: number): string => {
    const ccdFee = Number(microCcdToCcd(microCcdFee));
    return `~${ccdFee.toFixed(4)} CCD (${(ccdFee * ccdPrice).toFixed(4)} USD)`;
};
