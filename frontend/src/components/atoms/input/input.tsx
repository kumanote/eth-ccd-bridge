import React, { InputHTMLAttributes } from "react";
import { StyledInput } from "./input.style";

interface Props extends InputHTMLAttributes<HTMLInputElement> {}

const Input = ({ ...rest }: Props) => {
    return <StyledInput {...rest} />;
};

export default Input;
