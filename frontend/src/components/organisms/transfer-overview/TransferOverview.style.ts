import Container from "@components/atoms/container/Container";
import styled from "styled-components";

export const StyledContainer = styled(Container)`
    padding: 27px 40px 40px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
`;

export const ButtonsContainer = styled.div`
    display: flex;
    & > :first-child {
        margin-right: 8px;
    }
`;

export const StyledProcessWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
`;
