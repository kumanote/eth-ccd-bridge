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

interface ChainBoxProps {
    chain: ChainType;
    text: string;
}

const ChainBox: React.FC<ChainBoxProps> = ({ chain, text }) => {
    // state for the copied address
    const [copied, setCopied] = useState<boolean>(false);

    const walletCopyHandler = () => {
        setCopied(true);
        navigator.clipboard.writeText(chain.account || "");
    };

    useEffect(() => {
        const copyTimeout = setTimeout(() => {
            setCopied(false);
        }, 1000);

        return () => clearTimeout(copyTimeout);
    }, [copied]);

    return (
        <CoinContainer>
            <OrderText>{text}</OrderText>
            <CoinSelect>
                <CoinPicker>
                    <Coin>
                        <Image src={chain.icon} alt={`${chain.name} icon`} height="23.13" width="23.13" />
                        <StyledCoinText fontWeight="light">{chain.name}</StyledCoinText>
                    </Coin>
                    {chain.account ? (
                        <StyledWalletDisplay copied={copied} copyId={chain.id} onClick={walletCopyHandler}>
                            {parseWallet(chain.account)}
                        </StyledWalletDisplay>
                    ) : (
                        <Button
                            variant="connect"
                            onClick={() => {
                                chain.connect && chain.connect();
                            }}
                        >
                            Connect
                        </Button>
                    )}
                </CoinPicker>
            </CoinSelect>
        </CoinContainer>
    );
};

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

    const [isDeposit, setIsDeposit] = useState(true);
    // introduced amount
    const [amount, setAmount] = useState("0");
    // eth token balance
    const [ethBalance, setEthBalance] = useState<string>("0");
    // ccd token balance
    const [ccdBalance, setCcdBalance] = useState<number>(0);

    // tokens available in the dropdown
    const [tokens, setTokens] = useState<Components.Schemas.TokenMapItem[]>();
    // state of the token dropdown
    const [dropdown, setDropdown] = useState(false);
    // current selected token
    const [selectedToken, setSelectedToken] = useState(token);

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

    const buttonHandler = async (amount: string) => {
        if (isDeposit) {
            onDeposit(amount);
        } else {
            onWithdraw(amount);
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
    useEffect(() => {
        setAmount("0");
    }, [isDeposit]);

    // tokens balance effects
    useEffect(() => {
        if (isLoggedIn && selectedToken) {
            fetchEthTokenBalance();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedToken, isLoggedIn, transferStatus, isDeposit]);
    useEffect(() => {
        if (ccdContext.account && selectedToken) {
            fetchCcdTokenBalance();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedToken, isLoggedIn, transferStatus, isDeposit]);

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
                        .sort((a, b) => (isDeposit ? +a.id - +b.id : +b.id - +a.id))
                        .map((chain, index) => (
                            <ChainBox key={chain.id} chain={chain} text={index === 0 ? "From" : "To"} />
                        ))}
                    <SwapContainer onClick={() => setIsDeposit((v) => !v)}>
                        <Image src={SwapIcon.src} alt="swap icon" width="14.4" height="11.52" />
                    </SwapContainer>
                </FirstRow>
                <SecondRow>
                    <MaxGapRow>
                        <Text fontWeight="light" onClick={dropdownHandler}>
                            {selectedToken
                                ? isDeposit
                                    ? selectedToken?.eth_name
                                    : selectedToken?.ccd_name
                                : "Select Token"}
                        </Text>
                        <Dropdown onClick={dropdownHandler}>
                            <Image src={ArrowDownIcon.src} alt="dropdown icon" height="12" width="12" />
                        </Dropdown>
                        <Button
                            variant="max"
                            onClick={() => (isDeposit ? setAmount(ethBalance) : setAmount(ccdBalance.toString()))}
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
                                            isDeposit
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
                                            {isDeposit ? eth_name : ccd_name}
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
                            max={isDeposit ? ethBalance : ccdBalance}
                        />
                        {isLoggedIn && selectedToken && (
                            <Text style={{ alignSelf: "flex-end" }} fontColor="Balance" fontSize="10">
                                Balance:&nbsp;{isDeposit ? ethBalance : ccdBalance}
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
                            {isDeposit ? "Deposit" : "Withdraw"}
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
