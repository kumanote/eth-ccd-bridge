import { Components } from "src/api-query/__generated__/AxiosClient";

const isError = (
  hookData: any | Components.Schemas.Error
): hookData is Components.Schemas.Error => {
  return (hookData as Components.Schemas.Error)?.message !== undefined;
};

export default isError;
