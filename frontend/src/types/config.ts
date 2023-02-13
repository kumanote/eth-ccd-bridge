import { WalletApi } from "@concordium/browser-wallet-api-helpers";

// Token Type
export enum TokenType {
  wETH,
}

// Currency Type
export type Tokens = {
  [key in TokenType]: {
    id: number;
    slug: string;
    name: string;
    symbol: string;
    address: string;
    native?: boolean;
  };
};

// Addresses type
export type Addresses = {
  genesis: string;
  weth: string;
  eth: string;
  root: string;
};

// Service type
export type Service = {
  baseApi: string | undefined;
  requestTimeout: number | undefined;
};

// Network Provider type
export type NetworkProvider = {
  network: string;
  key: string;
  chainId: number;
  chainIdHex: string;
};

// Network Providers type
export type NetworkProviders = {
  ethereum: NetworkProvider;
  polygon: NetworkProvider;
};

// Network type
export type Network = {
  supportedChainIds: number[];
  providers: NetworkProviders;
};

// Connector Names
export enum ConnectorNames {
  Injected = "Injected",
  // Network = 'Network',
  WalletConnect = "WalletConnect",
  // WalletLink = 'WalletLink',
  // Ledger = 'Ledger',
  // Trezor = 'Trezor',
  // Lattice = 'Lattice',
  // Frame = 'Frame',
  // Authereum = 'Authereum',
  // Fortmatic = 'Fortmatic',
  // Magic = 'Magic',
  // Portis = 'Portis',
  // Torus = 'Torus',
}

export enum PoolTypes {
  ThreeMonths,
  SixMonths,
  TwelveMonths,
}

export type FixedStakingPools = {
  [key in PoolTypes]: {
    id: number;
    apy: number;
    duration: number;
  };
};

declare global {
  interface Window {
    concordium: WalletApi | undefined;
  }
}
