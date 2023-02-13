import type {
  OpenAPIClient,
  Parameters,
  UnknownParamsObject,
  OperationResponse,
  AxiosRequestConfig,
} from 'openapi-client-axios'; 

export declare namespace Components {
    namespace Responses {
        export type Error = /* Error information from a response. */ Schemas.Error;
    }
    namespace Schemas {
        export interface CcdToken {
            contract_index: number; // uint64
            contract_subindex: number; // uint64
            decimals: number; // uint8
            name: string;
        }
        /**
         * Error information from a response.
         */
        export interface Error {
            error_code?: string;
            message: string;
            request_id: string;
        }
        export interface EthMerkleProofResponse {
            params: WithdrawParams;
            proof: string;
        }
        export interface EthToken {
            contract: string;
            decimals: number; // uint8
            name: string;
        }
        export interface ListTokensResponse {
            tokens: TokenMapItem[];
        }
        export interface TokenMapItem {
            ccd_token: CcdToken;
            eth_token: EthToken;
        }
        export interface TokenMetadataLocalizationResponse {
            hash: string;
            url: string;
        }
        export interface TokenMetadataResponse {
            artifact: string;
            decimals: number; // uint8
            description: string;
            display: string;
            localization: {
                [name: string]: TokenMetadataLocalizationResponse;
            };
            name: string;
            symbol: string;
            thumbnail: string;
        }
        export interface WalletDepositTx {
            amount: string;
            ccd_event_id?: null | number; // uint64
            ccd_token: CcdToken;
            ccd_tx_hash?: string | null;
            eth_event_id: number; // uint64
            eth_token: EthToken;
            eth_tx_hash: string;
            status: string;
            timestamp: number; // uint64
        }
        export type WalletTx = {
            Deposit: WalletDepositTx;
        } | {
            Withdraw: WalletWithdrawTx;
        };
        export interface WalletTxResponse {
            count: number; // uint
            transactions: WalletTx[];
        }
        export interface WalletWithdrawTx {
            amount: string;
            ccd_event_id: number; // uint64
            ccd_token: CcdToken;
            ccd_tx_hash: string;
            eth_event_id?: null | number; // uint64
            eth_token: EthToken;
            eth_tx_hash?: string | null;
            status: string;
            timestamp: number; // uint64
        }
        export interface WatchTxResponse {
            concordium_tx_hash?: string | null;
            status: string;
        }
        export interface WithdrawParams {
            amount: string;
            ccd_event_index: number; // uint64
            ccd_index: number; // uint64
            ccd_sub_index: number; // uint64
            ccd_tx_hash: string;
            token_id: number; // uint64
            user_wallet: string;
        }
    }
}
export declare namespace Paths {
    namespace EthMerkleProof {
        namespace Parameters {
            export type EventId = number; // uint64
            export type TxHash = string;
        }
        export interface PathParameters {
            event_id: Parameters.EventId /* uint64 */;
            tx_hash: Parameters.TxHash;
        }
        namespace Responses {
            export type $200 = Components.Schemas.EthMerkleProofResponse;
            export type $4XX = Components.Responses.Error;
            export type $5XX = Components.Responses.Error;
        }
    }
    namespace ListTokens {
        namespace Responses {
            export type $200 = Components.Schemas.ListTokensResponse;
            export type $4XX = Components.Responses.Error;
            export type $5XX = Components.Responses.Error;
        }
    }
    namespace TokenMetadata {
        namespace Parameters {
            export type Symbol = string;
        }
        export interface PathParameters {
            symbol: Parameters.Symbol;
        }
        namespace Responses {
            export type $200 = Components.Schemas.TokenMetadataResponse;
            export type $4XX = Components.Responses.Error;
            export type $5XX = Components.Responses.Error;
        }
    }
    namespace WalletTxs {
        namespace Parameters {
            export type Wallet = string;
        }
        export interface PathParameters {
            wallet: Parameters.Wallet;
        }
        namespace Responses {
            export type $200 = Components.Schemas.WalletTxResponse;
            export type $4XX = Components.Responses.Error;
            export type $5XX = Components.Responses.Error;
        }
    }
    namespace WatchDepositTx {
        namespace Parameters {
            export type TxHash = string;
        }
        export interface PathParameters {
            tx_hash: Parameters.TxHash;
        }
        namespace Responses {
            export type $200 = Components.Schemas.WatchTxResponse;
            export type $4XX = Components.Responses.Error;
            export type $5XX = Components.Responses.Error;
        }
    }
    namespace WatchWithdrawTx {
        namespace Parameters {
            export type TxHash = string;
        }
        export interface PathParameters {
            tx_hash: Parameters.TxHash;
        }
        namespace Responses {
            export type $200 = Components.Schemas.WatchTxResponse;
            export type $4XX = Components.Responses.Error;
            export type $5XX = Components.Responses.Error;
        }
    }
}

export interface OperationMethods {
  /**
   * watch_deposit_tx
   */
  'watch_deposit_tx'(
    parameters?: Parameters<Paths.WatchDepositTx.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.WatchDepositTx.Responses.$200>
  /**
   * eth_merkle_proof
   */
  'eth_merkle_proof'(
    parameters?: Parameters<Paths.EthMerkleProof.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.EthMerkleProof.Responses.$200>
  /**
   * list_tokens
   */
  'list_tokens'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListTokens.Responses.$200>
  /**
   * wallet_txs
   */
  'wallet_txs'(
    parameters?: Parameters<Paths.WalletTxs.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.WalletTxs.Responses.$200>
  /**
   * watch_withdraw_tx
   */
  'watch_withdraw_tx'(
    parameters?: Parameters<Paths.WatchWithdrawTx.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.WatchWithdrawTx.Responses.$200>
  /**
   * docs
   */
  'docs'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<any>
  /**
   * redoc
   */
  'redoc'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<any>
  /**
   * token_metadata
   */
  'token_metadata'(
    parameters?: Parameters<Paths.TokenMetadata.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.TokenMetadata.Responses.$200>
}

export interface PathsDictionary {
  ['/api/v1/deposit/{tx_hash}']: {
    /**
     * watch_deposit_tx
     */
    'get'(
      parameters?: Parameters<Paths.WatchDepositTx.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.WatchDepositTx.Responses.$200>
  }
  ['/api/v1/ethereum/proof/{tx_hash}/{event_id}']: {
    /**
     * eth_merkle_proof
     */
    'get'(
      parameters?: Parameters<Paths.EthMerkleProof.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.EthMerkleProof.Responses.$200>
  }
  ['/api/v1/tokens']: {
    /**
     * list_tokens
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListTokens.Responses.$200>
  }
  ['/api/v1/wallet/{wallet}']: {
    /**
     * wallet_txs
     */
    'get'(
      parameters?: Parameters<Paths.WalletTxs.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.WalletTxs.Responses.$200>
  }
  ['/api/v1/withdraw/{tx_hash}']: {
    /**
     * watch_withdraw_tx
     */
    'get'(
      parameters?: Parameters<Paths.WatchWithdrawTx.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.WatchWithdrawTx.Responses.$200>
  }
  ['/openapi.json']: {
    /**
     * docs
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<any>
  }
  ['/redoc']: {
    /**
     * redoc
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<any>
  }
  ['/token/metadata/{symbol}']: {
    /**
     * token_metadata
     */
    'get'(
      parameters?: Parameters<Paths.TokenMetadata.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.TokenMetadata.Responses.$200>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>
