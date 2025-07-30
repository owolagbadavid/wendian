export abstract class PaymentService {
  abstract initiateTransfer(payload: {
    bankCode: string;
    accountNumber: string;
    amount: number;
    narration: string;
    currency: string;
    reference: string;
    callbackUrl?: string;
    debitCurrency?: string;
  }): Promise<{
    externalRef: string;
    status: string;
    amount: number;
    currency: string;
    internalRef: string;
    accountNumber: string;
    bankName: string;
    bankCode: string;
  }>;

  abstract getBanks(country: 'NG' | 'GH' | 'KE' | 'UG' | 'ZA' | 'TZ'): Promise<
    {
      code: string;
      name: string;
    }[]
  >;

  abstract getTransfer(transferId: string): Promise<{
    externalRef: string;
    status: string;
    amount: number;
    currency: string;
    internalRef: string;
    accountNumber: string;
    bankName: string;
    bankCode: string;
  }>;

  abstract verifyTransaction(ref: string): Promise<{
    internalRef: string;
    externalRef: string;
    amount: number;
    status: string;
    currency: string;
  }>;

  abstract verifyTransactionBySystemRef(systemRef: string): Promise<{
    internalRef: string;
    externalRef: string;
    amount: number;
    status: string;
    currency: string;
  }>;

  abstract refundTransaction(
    ref: string,
    amount: string,
  ): Promise<{
    externalRef: string;
    status: string;
    amount: number;
    destination: string;
  }>;

  abstract initiatePayment(
    payload: {
      amount: number;
      email: string;
      fullName: string;
      currency?: string;
      callbackUrl: string;
    },
    ref: string,
  ): Promise<{
    link: string;
  }>;

  abstract verifyAccount(payload: {
    accountNumber: string;
    bankCode: string;
  }): Promise<{
    accountNumber: string;
    accountName: string;
  }>;

  abstract createVirtualAccount(payload: {
    email: string;
    bvn: string;
    phoneNumber: string;
    reference: string;
    firstName: string;
    lastName: string;
  }): Promise<{
    accountNumber: string;
    bankName: string;
    reference: string;
    expiryDate: string;
  }>;
}
