import { ethers } from "ethers";

const parseAmount = (amount: string, decimals: number): number => {
    if (!amount) {
        throw new Error("Invalid amount");
    }
    if (!decimals) {
        throw new Error("Invalid decimals");
    }

    let parsedAmount;
    if (decimals === 18) {
        parsedAmount = Number(parseFloat(ethers.utils.formatEther(amount)).toFixed(4));
    } else {
        parsedAmount = Number((+amount / 10 ** decimals).toFixed(4));
    }

    return parsedAmount;
};

export default parseAmount;
