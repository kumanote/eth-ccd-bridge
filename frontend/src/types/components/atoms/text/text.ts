export type Size = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "h7" | "h8";

export type ThemeColor =
  | "DarkGrey"
  | "White"
  | "TitleText"
  | "ModalBackground"
  | "Black"
  | "Brown"
  | "TextBrown"
  | "DarkYellow"
  | "Balance"
  | "Red"
  | "Green"
  | "Yellow";

export type Family = "Roboto" | "Helvetica";

export type Weight = "regular" | "light" | "bold";

export type TextProps = {
  fontSize?: string;
  fontColor?: ThemeColor;
  fontWeight?: Weight;
  fontFamily?: Family;
  fontLetterSpacing?: string;
};
