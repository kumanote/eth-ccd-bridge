import { useRouter } from "next/router";
import { FC, useEffect } from "react";
import useEthMerkleProof from "src/api-query/use-eth-merkle-proof/useEthMerkpleProof";
import { usePendingWithdrawals } from "src/api-query/use-wallet-transactions/useWalletTransactions";
import { Components } from "src/api-query/__generated__/AxiosClient";
import { BridgeDirection, routes } from "src/constants/routes";

const WatchWithdrawal: FC<Components.Schemas.WalletWithdrawTx> = ({ origin_event_index, origin_tx_hash }) => {
    const { push } = useRouter();

    if (origin_tx_hash === undefined || origin_event_index === undefined) {
        throw new Error("Dependencies not available");
    }
    const { data } = useEthMerkleProof({ tx_hash: origin_tx_hash, event_id: origin_event_index });

    useEffect(() => {
        if (data?.proof) {
            console.log("Found withdrawal ready for approval:", origin_tx_hash, data.proof);
            push(routes.history(BridgeDirection.Withdraw));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.proof]);

    return null;
};

const WatchWithdrawals: FC = () => {
    const { data } = usePendingWithdrawals();

    if (data === undefined) {
        return null;
    }

    return (
        <>
            {data.map((tx) => (
                <WatchWithdrawal key={tx.origin_tx_hash} {...tx} />
            ))}
        </>
    );
};

export default WatchWithdrawals;
