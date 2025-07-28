/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

// Generic interfaces for payment operations
interface VirtualAccountRequest {
  accountReference: string;
  accountName: string;
  customerEmail: string;
  customerName: string;
  bvn?: string;
  nin?: string;
}

interface VirtualAccountResponse {
  responseMessage: string;
  responseBody: any;
}

interface FundTransferRequest {
  amount: number;
  reference: string;
  narration: string;
  destinationAccountNumber: string;
  destinationBankCode: string;
}

interface FundTransferResponse {
  responseCode: string;
  requestSuccessful: boolean;
  responseBody: any;
}

interface Bank {
  code: string;
  name: string;
}

interface BanksResponse {
  banks: Bank[];
}

interface AccountValidationResponse {
  responseMessage: string;
  responseBody: any;
}

interface PaymentRequest {
  amount: number;
  customerName: string;
  customerEmail: string;
  paymentReference: string;
  paymentDescription: string;
  contractCode: string;
  redirectUrl?: string;
}

interface PaymentResponse {
  responseCode: string;
  responseBody: any;
}

interface TransactionStatusResponse {
  responseMessage: string;
  responseBody: any;
}

interface TransferStatusResponse {
  responseMessage: string;
  responseBody: any;
}

interface AccessToken {
  apiKey: string;
  token: string;
  expiresInDate: Date;
}

// Abstract Payment Service
@Injectable()
abstract class PaymentService {
  protected accessTokens?: AccessToken;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {}

  protected async sendAsync<T>(
    url: string,
    method: string,
    config: any,
    data?: any,
    ignoreAuthorization = false,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!ignoreAuthorization) {
      const validToken = await this.getValidToken(config);
      headers['Authorization'] = `Bearer ${validToken}`;
    }

    const response = await firstValueFrom(
      this.httpService.request({
        url,
        method,
        headers,
        data,
      }),
    );

    if (![200, 201, 202].includes(response.status)) {
      const errorResponse = response.data;
      throw new Error(JSON.stringify(errorResponse));
    }

    return response.data;
  }

  protected abstract getValidToken(config: any): Promise<string>;

  abstract createVirtualAccount(
    model: VirtualAccountRequest,
  ): Promise<VirtualAccountResponse>;
  abstract fundTransfer(
    model: FundTransferRequest,
  ): Promise<FundTransferResponse>;
  abstract getBanks(): Promise<BanksResponse>;
  abstract accountValidation(
    accountNumber: string,
    bankCode: string,
  ): Promise<AccountValidationResponse>;
  abstract initiatePayment(model: PaymentRequest): Promise<PaymentResponse>;
  abstract getTransactionStatus(
    transactionRef: string,
  ): Promise<TransactionStatusResponse>;
  abstract getTransactionStatusBySystemRef(
    systemRef: string,
  ): Promise<TransactionStatusResponse>;
  abstract getTransferStatusByReference(
    reference: string,
  ): Promise<TransferStatusResponse>;
  abstract authTransfer(reference: string, otp: string): Promise<void>;
}

export {
  PaymentService,
  VirtualAccountRequest,
  VirtualAccountResponse,
  FundTransferRequest,
  FundTransferResponse,
  BanksResponse,
  AccountValidationResponse,
  PaymentRequest,
  PaymentResponse,
  TransactionStatusResponse,
  TransferStatusResponse,
  AccessToken,
};
