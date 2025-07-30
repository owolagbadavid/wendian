import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import Flutterwave from 'flutterwave-node-v3';

import { catchError, firstValueFrom } from 'rxjs';
import { DEFAULT_CURRENCY } from '../constants';
import { PaymentService } from './payment.service';

@Injectable()
export class FlutterwaveService extends PaymentService {
  private readonly flw: Flutterwave;
  private readonly logger = new Logger(FlutterwaveService.name);

  constructor(
    private readonly configService: ConfigService,
    private httpService: HttpService,
  ) {
    super();
    this.flw = new Flutterwave(
      this.configService.get<string>('FLW_PUBLIC_KEY') || '',
      this.configService.get<string>('FLW_SECRET_KEY') || '',
    );
  }

  async initiateTransfer(payload: {
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
  }> {
    try {
      const transferPayload = {
        account_bank: payload.bankCode,
        account_number: payload.accountNumber,
        amount: payload.amount,
        narration: payload.narration,
        currency: payload.currency,
        reference: payload.reference,
        callback_url: payload.callbackUrl,
        debit_currency: payload.debitCurrency || DEFAULT_CURRENCY,
      };

      const response = await this.flw.Transfer.initiate(transferPayload);

      this.logger.log('Transfer initiated successfully');

      if (response.status !== 'success') {
        throw new Error(response?.message || 'Transfer initiation failed');
      }

      const data = response.data;
      if (!data) {
        throw new Error(response?.message || 'No data found ');
      }

      const res = {
        externalRef: data.id.toString(),
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        internalRef: data.reference,
        accountNumber: data.account_number,
        bankName: data.bank_name,
        bankCode: data.bank_code,
      };

      return res;
    } catch (error) {
      this.logger.error('Error initiating transfer', error);
      throw error;
    }
  }

  async getBanks(country: 'NG' | 'GH' | 'KE' | 'UG' | 'ZA' | 'TZ'): Promise<
    {
      code: string;
      name: string;
    }[]
  > {
    try {
      const payload = { country };
      const response = await this.flw.Bank.country(payload);

      if (response.status !== 'success') {
        throw new Error(response?.message || 'Bank fetch failed');
      }

      this.logger.log('Banks fetched successfully');
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching banks', error);
      throw error;
    }
  }

  async getTransfer(transferId: string): Promise<{
    externalRef: string;
    status: string;
    amount: number;
    currency: string;
    internalRef: string;
    accountNumber: string;
    bankName: string;
    bankCode: string;
  }> {
    try {
      const payload = { id: transferId };
      const response = await this.flw.Transfer.get_a_transfer(payload);
      this.logger.log('Transfer details fetched successfully');

      if (response.status !== 'success') {
        throw new Error(response?.message || 'Transfer fetch failed');
      }

      const data = response.data;
      if (!data) {
        throw new Error(response?.message || 'No data found ');
      }

      const res = {
        externalRef: data.id.toString(),
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        internalRef: data.reference,
        accountNumber: data.account_number,
        bankName: data.bank_name,
        bankCode: data.bank_code,
      };
      return res;
    } catch (error) {
      this.logger.error('Error fetching transfer details', error);
      throw error;
    }
  }

  async verifyTransaction(ref: string): Promise<{
    internalRef: string;
    externalRef: string;
    amount: number;
    status: string;
    currency: string;
  }> {
    try {
      const payload = { id: ref };
      const response = await this.flw.Transaction.verify(payload);
      if (response.status !== 'success') {
        throw new Error(response?.message || 'Transaction verification failed');
      }

      const data = response.data;
      if (!data) {
        throw new Error(
          response?.message || 'No data found for the transaction',
        );
      }

      const res = {
        internalRef: data.tx_ref,
        externalRef: data.id.toString(),
        amount: data.amount,
        status: data.status,
        currency: data.currency,
      };

      return res;
    } catch (error) {
      this.logger.error('Error verifying transaction', error);
      throw error;
    }
  }

  async verifyTransactionBySystemRef(systemRef: string): Promise<{
    internalRef: string;
    externalRef: string;
    amount: number;
    status: string;
    currency: string;
  }> {
    try {
      const payload = { tx_ref: systemRef };
      const response = await this.flw.Transaction.verify_by_tx(payload);
      if (response.status !== 'success') {
        throw new Error(response?.message || 'Transaction verification failed');
      }

      const data = response.data;
      if (!data) {
        throw new Error(
          response?.message || 'No data found for the transaction',
        );
      }

      const res = {
        internalRef: data.tx_ref,
        externalRef: data.id.toString(),
        amount: data.amount,
        status: data.status,
        currency: data.currency,
      };

      return res;
    } catch (error) {
      this.logger.error('Error verifying transaction by tx_ref', error);
      throw error;
    }
  }

  async refundTransaction(ref: string, amount: string): Promise<any> {
    try {
      const payload = { id: ref, amount };
      const response = await this.flw.Transaction.refund(payload);

      if (response.status !== 'success') {
        throw new Error(response?.message || 'Transaction refund failed');
      }

      const data = response.data;
      if (!data) {
        throw new Error(response?.message || 'No data found ');
      }

      const res = {
        externalRef: data.id.toString(),
        status: data.status,
        amount: data.amount_refunded,
        destination: data.destination,
      };

      this.logger.log('Refund initiated successfully');
      return res;
    } catch (error) {
      this.logger.error('Error initiating refund', error);
      throw error;
    }
  }

  async initiatePayment(
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
  }> {
    try {
      const currency = payload.currency || DEFAULT_CURRENCY;

      const { data: response } = await firstValueFrom(
        this.httpService
          .post<{
            status: string;
            message: string;
            data: { link: string };
          }>(
            this.configService.get<string>('FLW_BASE_URL') + '/payments',
            {
              amount: payload.amount,
              tx_ref: ref,
              currency: currency,
              redirect_url: payload.callbackUrl,
              configuration: {
                session_duration: 20,
              },
              customer: {
                email: payload.email,
                name: payload.fullName,
              },
            },
            {
              headers: {
                Authorization: `Bearer ${this.configService.get('FLW_SECRET_KEY')}`,
                'Content-Type': 'application/json',
              },
            },
          )
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error('Error initiating payment', error);
              throw error;
            }),
          ),
      );

      if (response.status !== 'success') {
        throw new Error(response.message || 'Payment initiation failed');
      }

      this.logger.log('Payment initiated successfully');
      return response.data;
    } catch (error) {
      this.logger.error('Error initiating payment', error);
      throw error;
    }
  }

  async verifyAccount(payload: {
    accountNumber: string;
    bankCode: string;
  }): Promise<{
    accountNumber: string;
    accountName: string;
  }> {
    try {
      const reqPayload = {
        account_number: payload.accountNumber,
        account_bank: payload.bankCode,
      };

      const response = await this.flw.Misc.verify_Account(reqPayload);
      if (response.status !== 'success') {
        throw new BadRequestException(
          response.message || 'Account verification failed',
        );
      }

      this.logger.log('Account verified successfully');

      if (!response.data) {
        throw new BadRequestException(
          response?.message || 'No data found for the account verification',
        );
      }

      return {
        accountNumber: response.data.account_number,
        accountName: response.data.account_name,
      };
    } catch (error) {
      this.logger.error('Error verifying account', error);
      throw error;
    }
  }

  async createVirtualAccount(payload: {
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
  }> {
    try {
      const response = await this.flw.VirtualAcct.create({
        email: payload.email,
        bvn: payload.bvn,
        tx_ref: payload.reference,
        // phonenumber: payload.phoneNumber,
        // firstname: payload.firstName,
        // lastname: payload.lastName,
        is_permanent: true,
        narration: `Virtual Account Creation for ${payload.firstName} ${payload.lastName}`,
      });

      if (response.status !== 'success') {
        throw new BadRequestException(
          response.message || 'Virtual account creation failed',
        );
      }

      if (!response.data) {
        throw new BadRequestException(
          response?.message || 'No data found for the virtual account creation',
        );
      }

      const data = response.data;

      const res = {
        accountNumber: data.account_number,
        bankName: data.bank_name,
        reference: data.order_ref,
        expiryDate: data.expiry_date,
      };

      this.logger.log('Virtual account created successfully');
      return res;
    } catch (error) {
      this.logger.error('Error creating virtual account', error);
      throw error;
    }
  }
}
