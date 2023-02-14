import styled from "styled-components";

export const StyledArrowWrapper = styled.div<{ isOpen: boolean }>`
    position: absolute;
    left: -18px;
    width: 12px;
    height: 12px;
    ${({ isOpen }) => !isOpen && "transform: rotate(270deg);"}
`;
