import Button from "@components/atoms/button/Button";
import Input from "@components/atoms/input/input";
import PageWrapper from "@components/atoms/page-wrapper/PageWrapper";
import Logo from "@components/molecules/logo/Logo";
import useCCDWallet from "@hooks/use-ccd-wallet";
import useWallet from "@hooks/use-wallet";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import useTokens from "src/api-query/use-tokens/useTokens";
import { Components } from "src/api-query/__generated__/AxiosClient";
import useCCDContract from "src/contracts/use-ccd-contract";
import useGenerateContract from "src/contracts/use-generate-contract";
import parseWallet from "src/helpers/parseWallet";
import ArrowDownIcon from "../../../../public/icons/arrow-down-icon.svg";
import ConcordiumIcon from "../../../../public/icons/concordium-icon.svg";
import EthereumIcon from "../../../../public/icons/ethereum-icon.svg";
import SwapIcon from "../../../../public/icons/sort-icon.svg";
import ButtonShine from "../../../../public/images/button-shine.png";
import Text from "../../atoms/text/text";
import {
    Coin,
    CoinContainer,
    CoinPicker,
    CoinSelect,
    Dropdown,
    DropdownList,
    FirstRow,
    LinkWrapper,
    MaxGapRow,
    OrderText,
    SecondRow,
    StyledButtonShine,
    StyledCoinText,
    StyledContainer,
    StyledWalletDisplay,
    SwapContainer,
} from "./Transfer.style";

interface ChainType {
    id: number;
    name: string;
    icon: string;
    account?: string | null;
    disconnect: (() => void) | null;
    connect: (() => void) | null;
}

interface Props {
    onDeposit: Function;
    onWithdraw: Function;
    onHistoryClick: Function;
    onSelectToken: Function;
    transferStatus: string;
    onDepositCompleted: Function;
    token?: Components.Schemas.TokenMapItem;
    isTablet: boolean;
    isMobile: boolean;
}

const Transfer: React.FC<Props> = ({
    onDeposit,
    onWithdraw,
    onHistoryClick,
    onSelectToken,
    transferStatus,
    onDepositCompleted,
    token,
    isTablet,
}) => {
    // hooks
    const tokensQuery = useTokens();
    const { context, connect, disconnect } = useWallet();
    const { ccdContext, connectCCD, disconnectCCD } = useCCDWallet();

    // order of the addresses (from - to)
    const [order, setOrder] = useState(1);

    // introduced amount
    const [amount, setAmount] = useState("0");

    // eth token balance and ccd token balance
    const [ethBalance, setEthBalance] = useState<string>("0");
    const [ccdBalance, setCcdBalance] = useState<number>(0);

    // tokens available in the dropdown
    const [tokens, setTokens] = useState<Components.Schemas.TokenMapItem[]>();
    // state of the token dropdown
    const [dropdown, setDropdown] = useState(false);
    // current selected token
    const [selectedToken, setSelectedToken] = useState(token);

    // the text of the main button
    const [buttonText, setButtonText] = useState<"Deposit" | "Withdraw">("Deposit");

    // state for the copied address
    const [copied, setCopied] = useState<number>();

    // state dependent hooks

    const { getBalance: getEthTokenBalance } = useGenerateContract(
        selectedToken?.eth_address || "", // address or empty string because the address is undefined on first renders
        !!selectedToken // plus it's disabled on the first render anyway
    );
    const { balanceOf: getCcdTokenBalance } = useCCDContract(ccdContext.account, ccdContext.isActive);

    // constants

    const isLoggedIn = !!context?.account && !!ccdContext.account;
    const chains: ChainType[] = [
        {
            id: 1,
            name: "Ethereum",
            account: context.account,
            icon: EthereumIcon.src,
            connect,
            disconnect,
        },
        {
            id: 2,
            name: "Concordium",
            icon: ConcordiumIcon.src,
            account: ccdContext.account,
            connect: connectCCD,
            disconnect: disconnectCCD,
        },
    ];

    // handlers

    const historyClickHandler = () => {
        onHistoryClick();
    };

    const dropdownHandler = () => {
        setDropdown((prev) => !prev);
    };

    const selectTokenHandler = (token: Components.Schemas.TokenMapItem) => {
        setSelectedToken(token);
        setDropdown(false);
        onSelectToken(token);
    };

    const swapHandler = () => {
        setOrder((prev) => {
            if (prev === 1) {
                setButtonText("Withdraw");
            } else {
                setButtonText("Deposit");
            }
            return -prev;
        });
        setAmount("0");
    };

    const buttonHandler = async (amount: string) => {
        if (buttonText === "Deposit") {
            onDeposit(amount);
        } else {
            onWithdraw(amount);
        }
    };

    const walletCopyHandler = (id: number) => {
        if (id === 1) {
            setCopied(1);
            navigator.clipboard.writeText(context.account || "");
        } else {
            // onCcdConnectClick();
        }
    };

    // functions
    const fetchEthTokenBalance = async () => {
        if (selectedToken) {
            const balance = await getEthTokenBalance(selectedToken.decimals);
            if (balance) setEthBalance(Number(balance.toFixed(4)).toString());
        }
    };
    const fetchCcdTokenBalance = async () => {
        if (selectedToken) {
            const balance = await getCcdTokenBalance(selectedToken);
            if (balance >= 0) setCcdBalance(Number(balance.toFixed(4)));
        }
    };

    // effects

    // tokens balance effects
    useEffect(() => {
        if (isLoggedIn && selectedToken) {
            fetchEthTokenBalance();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedToken, isLoggedIn, transferStatus, order]);
    useEffect(() => {
        if (ccdContext.account && selectedToken) {
            fetchCcdTokenBalance();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedToken, isLoggedIn, transferStatus, order]);

    useEffect(() => {
        if (tokensQuery.status === "error") {
            console.log(tokensQuery.error); // TODO: error handling
        } else if (tokensQuery.status === "success") {
            setTokens(tokensQuery.data);
        }
    }, [tokensQuery]);

    useEffect(() => {
        if (transferStatus === "Transaction processed!") {
            onDepositCompleted();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transferStatus]);

    useEffect(() => {
        const copyTimeout = setTimeout(() => {
            setCopied(undefined);
        }, 1000);

        return () => clearTimeout(copyTimeout);
    }, [copied]);

    // button memo
    const transferButtonDisabled = useMemo(() => {
        if (!isLoggedIn) return true;
        if (!selectedToken) return true;
        if (!amount) return true;
        if (!(parseFloat(amount) > 0)) return true;

        return false;
    }, [amount, isLoggedIn, selectedToken]);

    return (
        <PageWrapper>
            <StyledContainer>
                {isTablet && <Logo logo="ccp" isTablet={isTablet} />}
                <Text fontFamily="Roboto" fontSize="24" fontWeight="light" fontColor="TitleText" fontLetterSpacing="0">
                    Transfer
                </Text>
                <FirstRow>
                    {chains
                        .sort((a, b) => (order === -1 ? +b.id - +a.id : +a.id - +b.id))
                        .map(({ id, name, account, icon, connect }, index) => (
                            <CoinContainer key={index}>
                                <OrderText>{index === 0 ? "From" : "To"}</OrderText>
                                <CoinSelect>
                                    <CoinPicker>
                                        <Coin>
                                            <Image src={icon} alt={`${name} icon`} height="23.13" width="23.13" />
                                            <StyledCoinText fontWeight="light">{name}</StyledCoinText>
                                        </Coin>
                                        {account && (
                                            <StyledWalletDisplay
                                                copied={copied}
                                                copyId={id}
                                                onClick={walletCopyHandler.bind(undefined, id)}
                                            >
                                                {parseWallet(account)}
                                            </StyledWalletDisplay>
                                        )}
                                        {!account && (
                                            <Button
                                                variant="connect"
                                                onClick={() => {
                                                    connect && connect();
                                                }}
                                            >
                                                Connect
                                            </Button>
                                        )}
                                    </CoinPicker>
                                </CoinSelect>
                            </CoinContainer>
                        ))}
                    <SwapContainer onClick={swapHandler}>
                        <Image src={SwapIcon.src} alt="swap icon" width="14.4" height="11.52" />
                    </SwapContainer>
                </FirstRow>
                <SecondRow>
                    <MaxGapRow>
                        <Text fontWeight="light" onClick={dropdownHandler}>
                            {selectedToken
                                ? order === 1
                                    ? selectedToken?.eth_name
                                    : selectedToken?.ccd_name
                                : "Select Token"}
                        </Text>
                        <Dropdown onClick={dropdownHandler}>
                            <Image src={ArrowDownIcon.src} alt="dropdown icon" height="12" width="12" />
                        </Dropdown>
                        <Button
                            variant="max"
                            onClick={() =>
                                buttonText === "Deposit" ? setAmount(ethBalance) : setAmount(ccdBalance.toString())
                            }
                        >
                            <Text fontSize="10" fontWeight="light">
                                Max
                            </Text>
                        </Button>
                        <DropdownList open={dropdown}>
                            {tokens?.map((token) => {
                                const { ccd_name, ccd_contract, eth_name, eth_address } = token;
                                return (
                                    <Coin
                                        onClick={selectTokenHandler.bind(undefined, token)}
                                        key={
                                            order === 1
                                                ? `${eth_name + eth_address}`
                                                : `${ccd_name + ccd_contract?.index + ccd_contract?.subindex}`
                                        }
                                    >
                                        <Image
                                            src={EthereumIcon.src}
                                            alt={`${token} icon`}
                                            height="23.13"
                                            width="23.13"
                                        />
                                        <StyledCoinText fontWeight="light">
                                            {order === 1 ? eth_name : ccd_name}
                                        </StyledCoinText>
                                    </Coin>
                                );
                            })}
                        </DropdownList>
                    </MaxGapRow>
                    <MaxGapRow input>
                        <Input
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            type="number"
                            step="0.01"
                            min="0.0"
                            max={order === 1 ? ethBalance : ccdBalance}
                        />
                        {isLoggedIn && selectedToken && (
                            <Text style={{ alignSelf: "flex-end" }} fontColor="Balance" fontSize="10">
                                Balance:&nbsp;{order === 1 ? ethBalance : ccdBalance}
                            </Text>
                        )}
                    </MaxGapRow>
                </SecondRow>
                <Button
                    variant="primary"
                    disabled={transferButtonDisabled}
                    onClick={buttonHandler.bind(undefined, amount)}
                >
                    <div style={{ position: "relative" }}>
                        <Text fontSize="16" fontColor={transferButtonDisabled ? "White" : "Brown"} fontWeight="regular">
                            {buttonText}
                        </Text>
                        <StyledButtonShine src={ButtonShine.src} />
                    </div>
                </Button>
                {isTablet && <Logo logo="ccd" isTablet={isTablet} />}
            </StyledContainer>
            {context?.account && (
                <LinkWrapper>
                    <Text fontSize="12" fontFamily="Roboto" fontColor="Brown" onClick={historyClickHandler}>
                        Transaction History
                    </Text>
                </LinkWrapper>
            )}
        </PageWrapper>
    );
};

export default Transfer;
