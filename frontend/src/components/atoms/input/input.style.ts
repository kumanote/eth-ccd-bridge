import theme from "src/theme/theme";
import styled from "styled-components";

export const StyledInput = styled.input`
  border: none;
  outline: none;
  font-family: Roboto;
  font-size: 25px;
  font-weight: regular;
  color: ${theme.colors.Black};
  letter-spacing: 0px;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Firefox */
  &[type="number"] {
    -moz-appearance: textfield;
  }
`;
