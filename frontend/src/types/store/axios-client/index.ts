import { Client } from "../../../api-query/__generated__/AxiosClient";

export interface AxiosClientState {
  client: Client | undefined;
}

export interface AxiosClientActions {
  getClient: () => Promise<Client | undefined>;
}

export type AxiosClientStore = AxiosClientState & AxiosClientActions;
