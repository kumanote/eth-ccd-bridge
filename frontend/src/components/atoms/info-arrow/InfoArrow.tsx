import Image from "next/image";
import React from "react";
import ArrowDownIcon from "../../../../public/icons/arrow-down-icon.svg";
import { StyledArrowWrapper } from "./InfoArrow.style";
interface Props {
    isOpen: boolean;
}

const InfoArrow: React.FC<Props> = ({ isOpen }) => {
    return (
        <StyledArrowWrapper isOpen={isOpen}>
            <Image src={ArrowDownIcon.src} alt="Info icon" height="12" width="12" />
        </StyledArrowWrapper>
    );
};

export default InfoArrow;
