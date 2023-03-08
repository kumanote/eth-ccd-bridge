import { ensureValue } from "src/helpers/basic";

const ccdExplorer = ensureValue(
    process.env.NEXT_PUBLIC_CCDSCAN_URL,
    "Expected NEXT_PUBLIC_CCDSCAN_URL to be provided as an environment variable"
);
const ethExplorer = ensureValue(
    process.env.NEXT_PUBLIC_ETHEREUM_EXPLORER_URL,
    "Expected NEXT_PUBLIC_ETHEREUM_EXPLORER_URL to be provided as an environment variable"
);
const bridgeApi = ensureValue(
    process.env.NEXT_PUBLIC_API_URL,
    "Expected NEXT_PUBLIC_ROOT_MANAGER_ADDRESS to be provided as an environment variable"
);

const urls = {
    ccdExplorer,
    ethExplorer,
    bridgeApi,
};

export default urls;
