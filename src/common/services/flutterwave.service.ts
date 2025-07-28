import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import Flutterwave from 'flutterwave-node-v3';

import { catchError, firstValueFrom } from 'rxjs';
import { DEFAULT_CURRENCY } from '../constants';

@Injectable()
export class FlutterwaveService {
  private readonly flw: Flutterwave;
  private readonly logger = new Logger(FlutterwaveService.name);

  constructor(
    private readonly configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.flw = new Flutterwave(
      this.configService.get<string>('FLW_PUBLIC_KEY') || '',
      this.configService.get<string>('FLW_SECRET_KEY') || '',
    );
  }

  async initiateTransfer(payload: {
    account_bank: string;
    account_number: string;
    amount: number;
    narration: string;
    currency: string;
    reference: string;
    callback_url?: string;
    debit_currency?: string;
  }): Promise<any> {
    try {
      const response = await this.flw.Transfer.initiate(payload);
      this.logger.log('Transfer initiated successfully');
      return response;
    } catch (error) {
      this.logger.error('Error initiating transfer', error);
      throw error;
    }
  }

  async getBanks(
    country: 'NG' | 'GH' | 'KE' | 'UG' | 'ZA' | 'TZ',
  ): Promise<any> {
    try {
      const payload = { country };
      const response = await this.flw.Bank.country(payload);
      this.logger.log('Banks fetched successfully');
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching banks', error);
      throw error;
    }
  }

  async getTransfer(transferId: string): Promise<any> {
    try {
      const payload = { id: transferId };
      const response = await this.flw.Transfer.get_a_transfer(payload);
      this.logger.log('Transfer details fetched successfully');
      return response;
    } catch (error) {
      this.logger.error('Error fetching transfer details', error);
      throw error;
    }
  }

  async verifyTransaction(transactionId: string): Promise<any> {
    try {
      const payload = { id: transactionId };
      const response = await this.flw.Transaction.verify(payload);
      this.logger.log('Transaction verified successfully');
      return response;
    } catch (error) {
      this.logger.error('Error verifying transaction', error);
      throw error;
    }
  }

  async verifyTransactionBySystemRef(systemRef: string): Promise<any> {
    try {
      const payload = { tx_ref: systemRef };
      const response = await this.flw.Transaction.verify_by_tx(payload);
      this.logger.log('Transaction verified by tx_ref successfully');
      return response;
    } catch (error) {
      this.logger.error('Error verifying transaction by tx_ref', error);
      throw error;
    }
  }

  async refundTransaction(transactionId: string, amount: string): Promise<any> {
    try {
      const payload = { id: transactionId, amount };
      const response = await this.flw.Transaction.refund(payload);
      this.logger.log('Refund initiated successfully');
      return response;
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
      callbackUrl: string;
    },
    ref: string,
  ): Promise<{
    link: string;
  }> {
    try {
      const { data: response } = await firstValueFrom(
        this.httpService
          .post<{
            status: string;
            message: string;
            data: { link: string };
          }>(
            'https://api.flutterwave.com/v3/payments',
            {
              amount: payload.amount,
              tx_ref: ref,
              currency: DEFAULT_CURRENCY,
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
      this.logger.log('Payment initiated successfully');
      return response.data;
    } catch (error) {
      this.logger.error('Error initiating payment', error);
      throw error;
    }
  }
}
