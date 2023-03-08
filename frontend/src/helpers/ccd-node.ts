import { createConcordiumClient, Ratio } from "@concordium/web-sdk";
import ccdNode from "@config/ccd-node";

function collapseRatio({ numerator, denominator }: Ratio): bigint {
    const quotient = numerator / denominator;
    if (numerator % denominator === 0n) {
        return quotient;
    }
    return 1n + quotient;
}

export const getEnergyToMicroCcdRate = async (): Promise<bigint> => {
    const client = createConcordiumClient(ccdNode.url, Number(ccdNode.port));
    const { euroPerEnergy, microGTUPerEuro } = await client.getBlockChainParameters();

    const denominator = euroPerEnergy.denominator * microGTUPerEuro.denominator;
    const numerator = euroPerEnergy.numerator * microGTUPerEuro.numerator;

    return collapseRatio({ numerator, denominator });
};
