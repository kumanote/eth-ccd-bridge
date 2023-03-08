import { ensureValue } from "src/helpers/basic";

const url = ensureValue(
    process.env.NEXT_PUBLIC_CCD_NODE_URL,
    "Expected NEXT_PUBLIC_CCD_NODE_URL to be provided as an environment variable"
);
const port = ensureValue(
    process.env.NEXT_PUBLIC_CCD_NODE_PORT,
    "Expected NEXT_PUBLIC_CCD_NODE_PORT to be provided as an environment variable"
);

const ccdNode = {
    url,
    port,
};

export default ccdNode;
