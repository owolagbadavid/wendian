/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { FlutterwaveService } from './flutterwave.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Logger, BadRequestException } from '@nestjs/common';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError, Observable } from 'rxjs';

// Minimal type definitions for Flutterwave responses
interface FlutterwaveResponse<T> {
  status: string;
  message?: string;
  data?: T;
}

interface TransferData {
  id: number;
  status: string;
  amount: number;
  currency: string;
  reference: string;
  account_number: string;
  bank_name: string;
  bank_code: string;
}

interface BankData {
  code: string;
  name: string;
}

interface TransactionData {
  id: number;
  tx_ref: string;
  amount: number;
  status: string;
  currency: string;
}

interface RefundData {
  id: number;
  status: string;
  amount_refunded: number;
  destination: string;
}

interface AccountVerificationData {
  account_number: string;
  account_name: string;
}

interface VirtualAccountData {
  account_number: string;
  bank_name: string;
  order_ref: string;
  expiry_date: string;
}

// Mock Flutterwave with typed methods
const mockFlutterwave = {
  Transfer: {
    initiate: jest.fn(),
    get_a_transfer: jest.fn(),
  },
  Bank: {
    country: jest.fn(),
  },
  Transaction: {
    verify: jest.fn(),
    verify_by_tx: jest.fn(),
    refund: jest.fn(),
  },
  Misc: {
    verify_Account: jest.fn(),
  },
  VirtualAcct: {
    create: jest.fn(),
  },
};

jest.mock('flutterwave-node-v3', () => {
  return jest.fn(() => mockFlutterwave);
});

describe('FlutterwaveService', () => {
  let service: FlutterwaveService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<Logger>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlutterwaveService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<FlutterwaveService>(FlutterwaveService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
    logger = module.get(Logger);

    // Mock ConfigService values
    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'FLW_PUBLIC_KEY':
          return 'mock-public-key';
        case 'FLW_SECRET_KEY':
          return 'mock-secret-key';
        case 'FLW_BASE_URL':
          return 'https://api.flutterwave.com/v3';
        default:
          return null;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateTransfer', () => {
    const payload = {
      bankCode: '044',
      accountNumber: '1234567890',
      amount: 1000,
      narration: 'Test transfer',
      currency: 'NGN',
      reference: 'ref123',
      callbackUrl: 'https://callback.url',
      debitCurrency: 'NGN',
    };

    it('should initiate transfer successfully', async () => {
      const response: FlutterwaveResponse<TransferData> = {
        status: 'success',
        message: 'Transfer initiated',
        data: {
          id: 123,
          status: 'pending',
          amount: 1000,
          currency: 'NGN',
          reference: 'ref123',
          account_number: '1234567890',
          bank_name: 'Test Bank',
          bank_code: '044',
        },
      };
      mockFlutterwave.Transfer.initiate.mockResolvedValue(response);

      const result = await service.initiateTransfer(payload);

      expect(result).toEqual({
        externalRef: '123',
        status: 'pending',
        amount: 1000,
        currency: 'NGN',
        internalRef: 'ref123',
        accountNumber: '1234567890',
        bankName: 'Test Bank',
        bankCode: '044',
      });
      expect(mockFlutterwave.Transfer.initiate).toHaveBeenCalledWith({
        account_bank: '044',
        account_number: '1234567890',
        amount: 1000,
        narration: 'Test transfer',
        currency: 'NGN',
        reference: 'ref123',
        callback_url: 'https://callback.url',
        debit_currency: 'NGN',
      });
    });

    it('should throw error for non-success status', async () => {
      mockFlutterwave.Transfer.initiate.mockResolvedValue({
        status: 'error',
        message: 'Invalid account',
      });

      await expect(service.initiateTransfer(payload)).rejects.toThrow(
        'Invalid account',
      );
    });

    it('should throw error for missing data', async () => {
      mockFlutterwave.Transfer.initiate.mockResolvedValue({
        status: 'success',
        message: 'No data found',
      });

      await expect(service.initiateTransfer(payload)).rejects.toThrow(
        'No data found',
      );
    });
  });

  describe('getBanks', () => {
    it('should fetch banks successfully', async () => {
      const response: FlutterwaveResponse<BankData[]> = {
        status: 'success',
        message: 'Banks fetched',
        data: [
          { code: '044', name: 'Access Bank' },
          { code: '063', name: 'Diamond Bank' },
        ],
      };
      mockFlutterwave.Bank.country.mockResolvedValue(response);

      const result = await service.getBanks('NG');

      expect(result).toEqual([
        { code: '044', name: 'Access Bank' },
        { code: '063', name: 'Diamond Bank' },
      ]);
      expect(mockFlutterwave.Bank.country).toHaveBeenCalledWith({
        country: 'NG',
      });
    });

    it('should throw error for non-success status', async () => {
      mockFlutterwave.Bank.country.mockResolvedValue({
        status: 'error',
        message: 'Invalid country',
      });

      await expect(service.getBanks('NG')).rejects.toThrow('Invalid country');
    });
  });

  describe('getTransfer', () => {
    it('should fetch transfer details successfully', async () => {
      const response: FlutterwaveResponse<TransferData> = {
        status: 'success',
        message: 'Transfer fetched',
        data: {
          id: 123,
          status: 'completed',
          amount: 1000,
          currency: 'NGN',
          reference: 'ref123',
          account_number: '1234567890',
          bank_name: 'Test Bank',
          bank_code: '044',
        },
      };
      mockFlutterwave.Transfer.get_a_transfer.mockResolvedValue(response);

      const result = await service.getTransfer('123');

      expect(result).toEqual({
        externalRef: '123',
        status: 'completed',
        amount: 1000,
        currency: 'NGN',
        internalRef: 'ref123',
        accountNumber: '1234567890',
        bankName: 'Test Bank',
        bankCode: '044',
      });
      expect(mockFlutterwave.Transfer.get_a_transfer).toHaveBeenCalledWith({
        id: '123',
      });
    });

    it('should throw error for non-success status', async () => {
      mockFlutterwave.Transfer.get_a_transfer.mockResolvedValue({
        status: 'error',
        message: 'Transfer not found',
      });

      await expect(service.getTransfer('123')).rejects.toThrow(
        'Transfer not found',
      );
    });

    it('should throw error for missing data', async () => {
      mockFlutterwave.Transfer.get_a_transfer.mockResolvedValue({
        status: 'success',
        message: 'No data found',
      });

      await expect(service.getTransfer('123')).rejects.toThrow('No data found');
    });
  });

  describe('verifyTransaction', () => {
    it('should verify transaction successfully', async () => {
      const response: FlutterwaveResponse<TransactionData> = {
        status: 'success',
        message: 'Transaction verified',
        data: {
          id: 456,
          tx_ref: 'tx123',
          amount: 500,
          status: 'successful',
          currency: 'NGN',
        },
      };
      mockFlutterwave.Transaction.verify.mockResolvedValue(response);

      const result = await service.verifyTransaction('456');

      expect(result).toEqual({
        internalRef: 'tx123',
        externalRef: '456',
        amount: 500,
        status: 'successful',
        currency: 'NGN',
      });
      expect(mockFlutterwave.Transaction.verify).toHaveBeenCalledWith({
        id: '456',
      });
      expect(logger.log).not.toHaveBeenCalled(); // No explicit log call in success case
    });

    it('should throw error for non-success status', async () => {
      mockFlutterwave.Transaction.verify.mockResolvedValue({
        status: 'error',
        message: 'Transaction not found',
      });

      await expect(service.verifyTransaction('456')).rejects.toThrow(
        'Transaction not found',
      );
    });

    it('should throw error for missing data', async () => {
      mockFlutterwave.Transaction.verify.mockResolvedValue({
        status: 'success',
        message: 'No data found for the transaction',
      });

      await expect(service.verifyTransaction('456')).rejects.toThrow(
        'No data found for the transaction',
      );
    });
  });

  describe('verifyTransactionBySystemRef', () => {
    it('should verify transaction by system ref successfully', async () => {
      const response: FlutterwaveResponse<TransactionData> = {
        status: 'success',
        message: 'Transaction verified',
        data: {
          id: 456,
          tx_ref: 'tx123',
          amount: 500,
          status: 'successful',
          currency: 'NGN',
        },
      };
      mockFlutterwave.Transaction.verify_by_tx.mockResolvedValue(response);

      const result = await service.verifyTransactionBySystemRef('tx123');

      expect(result).toEqual({
        internalRef: 'tx123',
        externalRef: '456',
        amount: 500,
        status: 'successful',
        currency: 'NGN',
      });
      expect(mockFlutterwave.Transaction.verify_by_tx).toHaveBeenCalledWith({
        tx_ref: 'tx123',
      });
      expect(logger.log).not.toHaveBeenCalled(); // No explicit log call in success case
    });

    it('should throw error for non-success status', async () => {
      mockFlutterwave.Transaction.verify_by_tx.mockResolvedValue({
        status: 'error',
        message: 'Transaction not found',
      });

      await expect(
        service.verifyTransactionBySystemRef('tx123'),
      ).rejects.toThrow('Transaction not found');
    });

    it('should throw error for missing data', async () => {
      mockFlutterwave.Transaction.verify_by_tx.mockResolvedValue({
        status: 'success',
        message: 'No data found for the transaction',
      });

      await expect(
        service.verifyTransactionBySystemRef('tx123'),
      ).rejects.toThrow('No data found for the transaction');
    });
  });

  describe('refundTransaction', () => {
    it('should initiate refund successfully', async () => {
      const response: FlutterwaveResponse<RefundData> = {
        status: 'success',
        message: 'Refund initiated',
        data: {
          id: 789,
          status: 'pending',
          amount_refunded: 500,
          destination: 'account',
        },
      };
      mockFlutterwave.Transaction.refund.mockResolvedValue(response);

      const result = await service.refundTransaction('789', '500');

      expect(result).toEqual({
        externalRef: '789',
        status: 'pending',
        amount: 500,
        destination: 'account',
      });
      expect(mockFlutterwave.Transaction.refund).toHaveBeenCalledWith({
        id: '789',
        amount: '500',
      });
    });

    it('should throw error for non-success status', async () => {
      mockFlutterwave.Transaction.refund.mockResolvedValue({
        status: 'error',
        message: 'Refund failed',
      });

      await expect(service.refundTransaction('789', '500')).rejects.toThrow(
        'Refund failed',
      );
    });

    it('should throw error for missing data', async () => {
      mockFlutterwave.Transaction.refund.mockResolvedValue({
        status: 'success',
        message: 'No data found',
      });

      await expect(service.refundTransaction('789', '500')).rejects.toThrow(
        'No data found',
      );
    });
  });

  describe('initiatePayment', () => {
    const payload = {
      amount: 1000,
      email: 'test@example.com',
      fullName: 'John Doe',
      callbackUrl: 'https://callback.url',
      currency: 'NGN',
    };

    it('should initiate payment successfully', async () => {
      const response = {
        status: 'success',
        message: 'Payment initiated',
        data: { link: 'https://payment.link' },
      };
      httpService.post.mockReturnValue(
        of({ data: response }) as Observable<AxiosResponse<unknown, unknown>>,
      );

      const result = await service.initiatePayment(payload, 'ref123');

      expect(result).toEqual({ link: 'https://payment.link' });
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/payments',
        {
          amount: 1000,
          tx_ref: 'ref123',
          currency: 'NGN',
          redirect_url: 'https://callback.url',
          configuration: { session_duration: 20 },
          customer: { email: 'test@example.com', name: 'John Doe' },
        },
        {
          headers: {
            Authorization: 'Bearer mock-secret-key',
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should throw error for non-success status', async () => {
      httpService.post.mockReturnValue(
        of({
          data: { status: 'error', message: 'Payment failed' },
        }) as Observable<AxiosResponse<unknown, unknown>>,
      );

      await expect(service.initiatePayment(payload, 'ref123')).rejects.toThrow(
        'Payment failed',
      );
    });

    it('should handle AxiosError', async () => {
      const axiosError = new AxiosError('Network error');
      httpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(service.initiatePayment(payload, 'ref123')).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('verifyAccount', () => {
    const payload = { accountNumber: '1234567890', bankCode: '044' };

    it('should verify account successfully', async () => {
      const response: FlutterwaveResponse<AccountVerificationData> = {
        status: 'success',
        message: 'Account verified',
        data: { account_number: '1234567890', account_name: 'John Doe' },
      };
      mockFlutterwave.Misc.verify_Account.mockResolvedValue(response);

      const result = await service.verifyAccount(payload);

      expect(result).toEqual({
        accountNumber: '1234567890',
        accountName: 'John Doe',
      });
      expect(mockFlutterwave.Misc.verify_Account).toHaveBeenCalledWith({
        account_number: '1234567890',
        account_bank: '044',
      });
    });

    it('should throw BadRequestException for non-success status', async () => {
      mockFlutterwave.Misc.verify_Account.mockResolvedValue({
        status: 'error',
        message: 'Invalid account',
      });

      await expect(service.verifyAccount(payload)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyAccount(payload)).rejects.toThrow(
        'Invalid account',
      );
    });

    it('should throw BadRequestException for missing data', async () => {
      mockFlutterwave.Misc.verify_Account.mockResolvedValue({
        status: 'success',
        message: 'Account verified',
      });

      await expect(service.verifyAccount(payload)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyAccount(payload)).rejects.toThrow(
        'Account verified',
      );
    });
  });

  describe('createVirtualAccount', () => {
    const payload = {
      email: 'test@example.com',
      bvn: '12345678901',
      phoneNumber: '1234567890',
      reference: 'ref123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should create virtual account successfully', async () => {
      const response: FlutterwaveResponse<VirtualAccountData> = {
        status: 'success',
        message: 'Virtual account created',
        data: {
          account_number: '9876543210',
          bank_name: 'Flutterwave Bank',
          order_ref: 'order123',
          expiry_date: '2025-12-31',
        },
      };
      mockFlutterwave.VirtualAcct.create.mockResolvedValue(response);

      const result = await service.createVirtualAccount(payload);

      expect(result).toEqual({
        accountNumber: '9876543210',
        bankName: 'Flutterwave Bank',
        orderReference: 'order123',
        reference: 'ref123',
        expiryDate: '2025-12-31',
      });
      expect(mockFlutterwave.VirtualAcct.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        bvn: '12345678901',
        tx_ref: 'ref123',
        is_permanent: true,
        narration: 'Virtual Account Creation for John Doe',
      });
    });

    it('should throw BadRequestException for non-success status', async () => {
      const response: FlutterwaveResponse<VirtualAccountData> = {
        status: 'error',
        message: 'Invalid BVN',
      };
      mockFlutterwave.VirtualAcct.create.mockResolvedValue(response);

      await expect(service.createVirtualAccount(payload)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createVirtualAccount(payload)).rejects.toThrow(
        'Invalid BVN',
      );
    });

    it('should throw BadRequestException for missing data', async () => {
      const response: FlutterwaveResponse<VirtualAccountData> = {
        status: 'success',
        message: undefined, // Ensure fallback message is used
      };
      mockFlutterwave.VirtualAcct.create.mockResolvedValue(response);

      await expect(service.createVirtualAccount(payload)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createVirtualAccount(payload)).rejects.toThrow(
        'No data found for the virtual account creation',
      );
    });
  });
});
