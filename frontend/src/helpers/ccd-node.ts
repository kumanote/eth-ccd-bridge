import { createConcordiumClient, Ratio, ConcordiumGRPCClient } from "@concordium/web-sdk";
import ccdNode from "@config/ccd-node";
import contractNames from "@config/contractNames";
import {
    deserializeTokenMetadataReturnValue,
    getMetadataParameter,
    getTokenMetadata,
    MetadataUrl,
} from "./token-helpers";

let client: ConcordiumGRPCClient;
const getClient = () => {
    if (!client) {
        client = createConcordiumClient(ccdNode.url, Number(ccdNode.port));
    }
    return client;
};

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
 * Gets energy to microCCD rate from the concordium node through the grpc v2 interface configured through environment variables
 */
export const getEnergyToMicroCcdRate = async (): Promise<bigint> => {
    const client = getClient();
    const { euroPerEnergy, microGTUPerEuro } = await client.getBlockChainParameters();

    const denominator = euroPerEnergy.denominator * microGTUPerEuro.denominator;
    const numerator = euroPerEnergy.numerator * microGTUPerEuro.numerator;

    return collapseRatio({ numerator, denominator });
};

const getTokenUrl = async (index: bigint, subindex: bigint): Promise<MetadataUrl> => {
    const client = getClient();

    const returnValue = await client.invokeContract({
        contract: { index, subindex },
        method: `${contractNames.cis2Bridgeable}.tokenMetadata`,
        parameter: getMetadataParameter([""]),
    });

    if (returnValue && returnValue.tag === "success" && returnValue.returnValue) {
        return deserializeTokenMetadataReturnValue(returnValue.returnValue)[0];
    } else {
        // TODO: perhaps we need to make this error more precise
        throw new Error("Token does not exist in this contract");
    }
};

export const tokenMetadataFor = async (index: bigint, subindex: bigint) => {
    try {
        const metadataUrl = await getTokenUrl(index, subindex);
        const metadata = getTokenMetadata(metadataUrl);

        return metadata;
    } catch (e) {
        console.error(e);
        throw new Error(`Failed to get metadata urls on index: ${index}`);
    }
};
