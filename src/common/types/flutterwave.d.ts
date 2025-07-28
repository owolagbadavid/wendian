/* eslint-disable @typescript-eslint/no-unused-vars */
declare module 'flutterwave-node-v3' {
  interface FlutterwaveConfig {
    publicKey: string;
    secretKey: string;
  }

  interface TransferPayload {
    account_bank: string;
    account_number: string;
    amount: number;
    narration: string;
    currency: string;
    reference: string;
    callback_url?: string;
    debit_currency?: string;
  }

  interface TransferResponse {
    status: string;
    message: string;
    data: {
      id: number;
      account_number: string;
      bank_code: string;
      full_name: string;
      created_at: string;
      currency: string;
      debit_currency: string;
      amount: number;
      fee: number;
      status: string;
      reference: string;
      meta: any;
      narration: string;
      complete_message: string;
      requires_approval: number;
      is_approved: number;
      bank_name: string;
    };
  }

  interface BankCountryPayload {
    country: 'NG' | 'GH' | 'KE' | 'UG' | 'ZA' | 'TZ';
  }

  interface Bank {
    id: number;
    code: string;
    name: string;
  }

  interface BankResponse {
    status: string;
    message: string;
    data: Bank[];
  }

  interface GetTransferPayload {
    id: string;
  }

  interface TransferFeeResponse {
    status: string;
    message: string;
    data: Array<{
      currency: string;
      fee_type: string;
      fee: number;
    }>;
  }

  interface TransactionVerifyPayload {
    id: string;
  }

  interface TransactionVerifyResponse {
    status: string;
    message: string;
    data: {
      id: number;
      tx_ref: string;
      flw_ref: string;
      device_fingerprint: string;
      amount: number;
      currency: string;
      charged_amount: number;
      app_fee: number;
      merchant_fee: number;
      processor_response: string;
      auth_model: string;
      ip: string;
      narration: string;
      status: string;
      payment_type: string;
      created_at: string;
      account_id: number;
      card: {
        first_6digits: string;
        last_4digits: string;
        issuer: string;
        country: string;
        type: string;
        token: string;
        expiry: string;
      };
      meta: any;
      amount_settled: number;
      customer: {
        id: number;
        name: string;
        phone_number: string;
        email: string;
        created_at: string;
      };
    };
  }

  interface TransactionVerifyByTxPayload {
    tx_ref: string;
  }

  interface RefundPayload {
    id: string;
    amount: string;
  }

  interface RefundResponse {
    status: string;
    message: string;
    data: {
      id: number;
      account_id: number;
      tx_id: number;
      flw_ref: string;
      wallet_id: number;
      amount_refunded: number;
      status: string;
      destination: string;
      meta: {
        source: string;
      };
      created_at: string;
    };
  }

  // interface PaymentPayload {
  //   amount: number;
  //   tx_ref: string;
  //   currency: string;
  //   redirect_url: string;
  //   configuration: {
  //     session_duration: number;
  //   };
  //   customer: {
  //     email: string;
  //     name: string;
  //   };
  // }

  // interface PaymentResponse {
  //   status: string;
  //   message: string;
  //   data: {
  //     link: string;
  //   };
  // }

  class Flutterwave {
    constructor(publicKey: string, secretKey: string);

    Transfer: {
      initiate: (payload: TransferPayload) => Promise<TransferResponse>;
      get_a_transfer: (
        payload: GetTransferPayload,
      ) => Promise<TransferFeeResponse>;
    };

    Bank: {
      country: (payload: BankCountryPayload) => Promise<BankResponse>;
    };

    Transaction: {
      verify: (
        payload: TransactionVerifyPayload,
      ) => Promise<TransactionVerifyResponse>;
      verify_by_tx: (
        payload: TransactionVerifyByTxPayload,
      ) => Promise<TransactionVerifyResponse>;
      refund: (payload: RefundPayload) => Promise<RefundResponse>;
    };
  }

  export = Flutterwave;
}
