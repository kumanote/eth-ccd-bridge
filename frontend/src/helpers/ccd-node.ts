import { createConcordiumClient, Ratio } from "@concordium/web-sdk";

function collapseRatio({ numerator, denominator }: Ratio): bigint {
    const quotient = numerator / denominator;
    if (numerator % denominator === 0n) {
        return quotient;
    }
    return 1n + quotient;
}

export const getEnergyToMicroCcdRate = async (): Promise<bigint> => {
    const client = createConcordiumClient(
        process.env.NEXT_PUBLIC_CCD_NODE_URL,
        Number(process.env.NEXT_PUBLIC_CCD_NODE_PORT)
    );
    const { euroPerEnergy, microGTUPerEuro } = await client.getBlockChainParameters();

    const denominator = euroPerEnergy.denominator * microGTUPerEuro.denominator;
    const numerator = euroPerEnergy.numerator * microGTUPerEuro.numerator;

    return collapseRatio({ numerator, denominator });
};
