import { createConcordiumClient, Ratio } from "@concordium/web-sdk";
import ccdNode from "@config/ccd-node";

/**
 * Collapses the `Ratio` into a single number.
 * If the denominator does not divide the numerator, the function rounds up;
 */
export function collapseRatio({ numerator, denominator }: Ratio): bigint {
    const quotient = numerator / denominator;
    if (numerator % denominator === 0n) {
        return quotient;
    }
    return 1n + quotient;
}

/**
 * Gets energy to microCCD rate from the concordium node throught the grpc v2 interface configured through environment variables
 */
export const getEnergyToMicroCcdRate = async (): Promise<bigint> => {
    const client = createConcordiumClient(ccdNode.url, Number(ccdNode.port));
    const { euroPerEnergy, microGTUPerEuro } = await client.getBlockChainParameters();

    const denominator = euroPerEnergy.denominator * microGTUPerEuro.denominator;
    const numerator = euroPerEnergy.numerator * microGTUPerEuro.numerator;

    return collapseRatio({ numerator, denominator });
};
