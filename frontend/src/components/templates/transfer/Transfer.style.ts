import styled from "styled-components";
import theme from "../../../theme/theme";
import Text from "../../atoms/text/text";
import PageWrapper from "@components/atoms/page-wrapper/PageWrapper";
import Container from "@components/atoms/container/Container";
import Link from "next/link";

export const StyledWrapper = styled(PageWrapper)``;

export const StyledContainer = styled(Container)`
    padding: 27px 40px;
    display: flex;
    flex-direction: column;
    gap: 30px;
`;

export const FirstRow = styled.div`
    position: relative;
    display: flex;
    width: 100%;
    justify-content: space-between;
    gap: 20px;

    @media only screen and (max-width: 540px) {
        flex-direction: column;
    }
`;

export const SecondRow = styled.div`
    display: flex;
    flex-direction: column;
    height: 100px;
    width: 100%;
    background: white;
    border-radius: 5px;
    justify-content: space-between;
    padding: 13px 22px;
`;

export const MaxGapRow = styled.div<{ input?: boolean }>`
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;

    & > :first-child {
        ${({ input }) => (input ? "width: 100%" : "cursor: pointer")};
    }
`;

export const CoinContainer = styled.div`
    display: flex;
    flex-direction: column;
    width: 50%;
    position: relative;

    @media only screen and (min-width: 1050px) {
        max-width: 200px;
    }

    @media only screen and (max-width: 540px) {
        width: 100%;
        max-width: 100%;
    }
`;

export const CoinSelect = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    background-color: white;
    height: auto;
    min-height: 91px;
    width: 100%;
    padding: 13px 22px;
    border-radius: 5px;
`;

export const CoinPicker = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
`;

export const Coin = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 13px;
`;

export const OrderText = styled(Text)`
    margin-bottom: 10px;
    color: ${theme.colors.DarkGrey};
    margin-left: 5px;
`;

export const StyledCoinText = styled(Text)`
    margin-left: 7px;
`;

export const SwapLink = styled.a`
    position: absolute;
    top: calc(50% + 13px);
    left: 50%;
    transform: translate(-50%, -50%);
    height: 25px;
    width: 25px;
    display: block;
    background: ${theme.colors.DarkYellow};
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    cursor: pointer;
    @media only screen and (max-width: 540px) {
        top: 137.5px;
    }
`;

export const StyledButtonShine = styled.img`
    position: absolute;
    right: -12px;
    bottom: -13px;
`;

export const Dropdown = styled.div`
    position: relative;
    margin-left: 10px;
    cursor: pointer;
`;

export const DropdownList = styled.div<{ open: boolean }>`
    position: absolute;
    top: 100%;
    left: -16px;
    box-shadow: 0px 6px 10px #00000014;
    border-radius: 5px;
    background-color: #fff;
    z-index: 150;
    opacity: 0;
    pointer-events: none;
    transition: 0.2s all;
    & > * {
        width: 100%;
        cursor: pointer;
        padding: 8px 16px;
        margin: 0;
        transition: 0.2s all;

        &:hover {
            background-color: #f1f1f1;
        }
    }

    ${({ open }) =>
        open &&
        `
  opacity: 1;
  pointer-events: all;
  `}
`;

export const LinkWrapper = styled.a`
    display: block;
    margin-top: 32px;
    user-select: none;
    text-decoration: underline;

    @media only screen and (max-width: 1050px) {
        position: relative;
        width: fit-content;
    }
`;

export const StyledWalletDisplay = styled.div<{
    copied: boolean;
}>`
    padding: 4px 8px;
    border: 1px solid grey;
    border-radius: 5px;
    font-size: 12px;
    cursor: pointer;

    &::before {
        content: "Copied!";
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
    }
    ${({ copied }) =>
        copied &&
        `&::before {
  opacity: 1;
}`}
`;

export const StyledForm = styled.form`
    display: flex;
    flex-direction: column;
    align-items: center;

    & > * {
        margin-bottom: 8px;
    }

    & > :nth-child(2),
    & > :last-child {
        margin-top: 12px;
        margin-bottom: 0;
    }
`;

export const StyledWalletLabel = styled.label`
    text-align: center;
    min-width: 95px;
    max-height: 26px;
    padding: 7px 12px;
    background: ${theme.colors.Brown};
    border: none;
    border-radius: 5px;
    font-size: 10px;
    color: white;
    font-weight: 300;
    cursor: pointer;
    box-shadow: 0px 3px 6px #0000001c;
    font-family: Roboto;
`;

export const StyledFileInput = styled.input`
    opacity: 0;
    width: 0;
    height: 0;
`;

export const StyledFileInputWrapper = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    & > :first-child {
        margin-right: 8px;
    }
    & > :last-child {
        width: 100%;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }
`;

export const StyledPasswordInput = styled.input`
    height: 21px;
    &:focus {
        outline: none !important;
        border: 1px solid ${theme.colors.Brown};
        box-shadow: 0 0 2px ${theme.colors.DarkYellow};
    }
`;
