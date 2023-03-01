import { useEffect, useState } from "react";

export const useAsyncMemo = <ReturnType>(
    getResult: () => Promise<ReturnType>,
    handleError: (e: any) => void = () => {},
    deps?: any[]
): ReturnType | undefined => {
    const [result, setResult] = useState<ReturnType>();
    useEffect(() => {
        getResult().then(setResult).catch(handleError);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return result;
};
