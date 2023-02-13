import * as leb from "leb128";

const decodeBalance = function (balance: string) {
  const buffer = Buffer.from(balance, "hex");
  const length = buffer.readUInt16LE(0);

  if (length !== 1) {
    throw new Error(`Invalid length: ${length}. Length should be 1.`);
  }

  const result = leb.unsigned.decode(buffer.slice(2));

  return result;
};

export default decodeBalance;
