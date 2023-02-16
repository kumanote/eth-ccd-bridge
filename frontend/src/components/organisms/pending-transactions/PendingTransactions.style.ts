import Container from "@components/atoms/container/Container";
import PageWrapper from "@components/atoms/page-wrapper/PageWrapper";
import theme from "src/theme/theme";
import styled from "styled-components";

export const Wrapper = styled(PageWrapper)``;

export const StyledContainer = styled(Container)`
    padding: 27px 40px;
    display: flex;
    flex-direction: column;
    gap: 30px;
    justify-content: space-around;

    & > div > :first-child {
        margin-bottom: 8px;
    }
    & > div > :last-child {
        align-items: center;
    }
`;

export const GapWrapper = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
`;

export const ButtonsContainer = styled.div`
    display: flex;
    & > :first-child {
        margin-right: 8px;
    }
`;
