/**
 * Converts a hex string to a base64 string.
 *
 * @param {string} hexString - The hex string to convert.
 * @returns {string} The base64 string equivalent to the input hex string.
 */
const hexToBase64 = (hexString: string): string => {
    // Create a byte array to hold the hex string data
    let bytes = [];

    // Iterate over the hex string, two characters at a time
    for (let i = 0; i < hexString.length; i += 2) {
        // Convert each pair of hexadecimal characters to a byte and add it to the array
        bytes.push(parseInt(hexString.slice(i, i + 2), 16));
    }

    // Use the Buffer.from function to convert the byte array to a base64 string
    return Buffer.from(bytes).toString("base64");
};

export default hexToBase64;
