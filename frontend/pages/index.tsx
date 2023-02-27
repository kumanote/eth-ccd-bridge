import type { NextPage } from "next";
import Transfer from "@components/templates/transfer";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { routes } from "src/constants/routes";

const Deposit: NextPage = () => {
    const { prefetch } = useRouter();

    useEffect(() => {
        prefetch(routes.deposit.overview);
        prefetch(routes.withdraw.path);
    }, [prefetch]);

    return <Transfer isDeposit />;
};

export default Deposit;
