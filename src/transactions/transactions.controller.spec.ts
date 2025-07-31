/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { SearchRequestDto } from 'src/common/dtos';
import { createHmac } from 'node:crypto';
import { FieldType, Operator, SortDirection } from 'src/common/enums';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let transactionsService: jest.Mocked<TransactionsService>;
  let configService: jest.Mocked<ConfigService>;

  const mockTransactionsService = {
    webhookHandler: jest.fn(),
    searchTransactions: jest.fn(),
    searchTransfers: jest.fn(),
    searchVirtualAccounts: jest.fn(),
    verifyWithdrawal: jest.fn(),
    handleWalletReversal: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService as unknown, // Cast to unknown to bypass type mismatch
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    transactionsService = module.get(TransactionsService);
    configService = module.get(ConfigService);

    // Mock FLW_WEBHOOK_SECRET
    configService.get.mockImplementation((key: string) => {
      if (key === 'FLW_WEBHOOK_SECRET') {
        return 'secret-hash-123';
      }
      return null;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleWebhook', () => {
    it('should process webhook with valid signature', async () => {
      const body = { event: 'charge.completed', data: { id: 123 } };
      const signature = 'secret-hash-123';
      transactionsService.webhookHandler.mockResolvedValue(undefined);

      const result = await controller.handleWebhook(signature, body);

      expect(result).toBeUndefined();
      expect(configService.get).toHaveBeenCalledWith('FLW_WEBHOOK_SECRET');
      expect(transactionsService.webhookHandler).toHaveBeenCalledWith(body);
    });

    it('should throw UnauthorizedException for missing signature', async () => {
      const body = { event: 'charge.completed', data: { id: 123 } };

      await expect(
        controller.handleWebhook(undefined as unknown as string, body),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.handleWebhook(undefined as unknown as string, body),
      ).rejects.toThrow('Invalid signature');
      expect(transactionsService.webhookHandler).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid signature', async () => {
      const body = { event: 'charge.completed', data: { id: 123 } };
      const signature = 'wrong-hash';

      await expect(controller.handleWebhook(signature, body)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.handleWebhook(signature, body)).rejects.toThrow(
        'Invalid signature',
      );
      expect(transactionsService.webhookHandler).not.toHaveBeenCalled();
    });
  });

  describe('isValidFlutterwaveWebhook', () => {
    it('should validate correct HMAC signature', () => {
      const rawBody = JSON.stringify({
        event: 'charge.completed',
        data: { id: 123 },
      });
      const secretHash = 'secret-hash-123';
      const hash = createHmac('sha256', secretHash)
        .update(rawBody)
        .digest('base64');

      const result = controller['isValidFlutterwaveWebhook'](
        rawBody,
        hash,
        secretHash,
      );

      expect(result).toBe(true);
    });

    it('should return false for incorrect HMAC signature', () => {
      const rawBody = JSON.stringify({
        event: 'charge.completed',
        data: { id: 123 },
      });
      const secretHash = 'secret-hash-123';
      const wrongHash = 'invalid-hash';

      const result = controller['isValidFlutterwaveWebhook'](
        rawBody,
        wrongHash,
        secretHash,
      );

      expect(result).toBe(false);
    });
  });

  describe('searchTransactions', () => {
    it('should call searchTransactions with SearchRequestDto', async () => {
      const searchRequest: SearchRequestDto = {
        filters: [
          {
            key: 'status',
            operator: Operator.EQUALS,
            fieldType: FieldType.STRING,
            value: 'success',
          },
        ],
        sorts: [{ key: 'created_at', direction: SortDirection.DESC }],
        page: 1,
        size: 10,
      };
      const result = { items: [], total: 0, page: 1, size: 10, totalPages: 0 };
      transactionsService.searchTransactions.mockResolvedValue(result);

      const response = await controller.searchTransactions(searchRequest);

      expect(response).toEqual(result);
      expect(transactionsService.searchTransactions).toHaveBeenCalledWith(
        searchRequest,
      );
    });
  });

  describe('searchTransfers', () => {
    it('should call searchTransfers with SearchRequestDto', async () => {
      const searchRequest: SearchRequestDto = {
        filters: [
          {
            key: 'amount',
            operator: Operator.GREATER_THAN,
            fieldType: FieldType.NUMBER,
            value: 1000,
          },
        ],
        sorts: [{ key: 'created_at', direction: SortDirection.ASC }],
        page: 2,
        size: 5,
      };
      const result = { items: [], total: 0, page: 2, size: 5, totalPages: 0 };
      transactionsService.searchTransfers.mockResolvedValue(result);

      const response = await controller.searchTransfers(searchRequest);

      expect(response).toEqual(result);
      expect(transactionsService.searchTransfers).toHaveBeenCalledWith(
        searchRequest,
      );
    });
  });

  describe('searchVirtualAccounts', () => {
    it('should call searchVirtualAccounts with SearchRequestDto', async () => {
      const searchRequest: SearchRequestDto = {
        filters: [
          {
            key: 'account_number',
            operator: Operator.EQUALS,
            fieldType: FieldType.STRING,
            value: '1234567890',
          },
        ],
        sorts: [{ key: 'created_at', direction: SortDirection.DESC }],
        page: 1,
        size: 20,
      };
      const result = { items: [], total: 0, page: 1, size: 20, totalPages: 0 };
      transactionsService.searchVirtualAccounts.mockResolvedValue(result);

      const response = await controller.searchVirtualAccounts(searchRequest);

      expect(response).toEqual(result);
      expect(transactionsService.searchVirtualAccounts).toHaveBeenCalledWith(
        searchRequest,
      );
    });
  });
});
