import React from "react";
import { LogoWrapper } from "./Logo.style";
import ConcordiumLogo from "../../../../public/icons/Concordium_Logo.svg";
import CornucopiaLogo from "../../../../public/images/Cornucopia-black@3x.png";
import Image from "next/image";
import Text from "@components/atoms/text/text";

interface Props {
  logo: "ccp" | "ccd";
  isTablet: boolean;
}

const Logo: React.FC<Props> = ({ logo, isTablet }) => {
  return (
    <LogoWrapper logo={logo}>
      {logo === "ccd" && (
        <Text
          fontFamily="Roboto"
          fontSize={isTablet ? "9" : "11"}
          fontWeight="regular"
          fontColor="Black"
          fontLetterSpacing="0"
        >
          Powered by
        </Text>
      )}
      <Image
        src={logo === "ccd" ? ConcordiumLogo.src : CornucopiaLogo.src}
        width={logo === "ccd" ? (isTablet ? 70 : 104) : isTablet ? 130 : 241}
        height={logo === "ccd" ? (isTablet ? 12 : 18) : isTablet ? 22 : 41}
        alt={`${logo === "ccd" ? "Concordium" : "Cornucopia"} Logo`}
      />
    </LogoWrapper>
  );
};

export default Logo;
