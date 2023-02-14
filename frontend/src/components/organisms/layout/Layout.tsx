import Logo from "@components/molecules/logo/Logo";
import useMediaQuery from "@hooks/use-media-query";
import React from "react";
import { Wrapper } from "./Layout.style";

interface Props {
    children: React.ReactNode;
}

const Layout: React.FC<Props> = ({ children }) => {
    const isTablet = useMediaQuery("(max-width: 1050px)");
    return (
        <Wrapper style={{ opacity: 0 }}>
            <Logo logo="ccd" isTablet={isTablet} /> {/* keep ccd logo in history */}
            {!isTablet && <Logo logo="ccp" isTablet={isTablet} />}
            {children}
        </Wrapper>
    );
};

export default Layout;
