/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { ConfigService } from '@nestjs/config';

import { Decimal } from 'decimal.js';
import { TransactionRepository } from 'src/db/repositories/transaction.repository';
import { WalletRepository } from 'src/db/repositories/wallet.repository';
import { TransferRepository } from 'src/db/repositories/transfer.repository';
import { UserRepository } from 'src/db/repositories/user.repository';
import { PaymentService } from 'src/common/services/payment.service';
import { UnitOfWork } from 'src/db/uow/uow';
import { WalletService } from 'src/wallet/wallet.service';
import { HelperService } from 'src/common/services/helper.service';
import { TransactionPrefixEnum } from 'src/common/enums';
import { Transaction } from 'src/db/entities';
import { Knex } from 'knex';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionRepository: jest.Mocked<TransactionRepository>;
  let walletRepository: jest.Mocked<WalletRepository>;
  let transferRepository: jest.Mocked<TransferRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let paymentService: jest.Mocked<PaymentService>;
  let configService: jest.Mocked<ConfigService>;
  let walletService: jest.Mocked<WalletService>;
  let unitOfWork: jest.Mocked<UnitOfWork>;

  const mockTransactionRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  };

  const mockWalletRepository = {
    findById: jest.fn(),
  };

  const mockTransferRepository = {
    // Not used in provided methods, but mocked for constructor
  };

  const mockUserRepository = {
    // Not used in provided methods, but mocked for constructor
  };

  const mockPaymentService = {
    getTransfer: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockWalletService = {
    depositToWallet: jest.fn(),
    verifyFundingPayment: jest.fn(),
  };

  const mockUnitOfWork = {
    executeInTransaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: TransactionRepository,
          useValue: mockTransactionRepository,
        },
        {
          provide: WalletRepository,
          useValue: mockWalletRepository,
        },
        {
          provide: TransferRepository,
          useValue: mockTransferRepository,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: UnitOfWork,
          useValue: mockUnitOfWork,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionRepository = module.get(TransactionRepository);
    walletRepository = module.get(WalletRepository);
    transferRepository = module.get(TransferRepository);
    userRepository = module.get(UserRepository);
    paymentService = module.get(PaymentService);
    configService = module.get(ConfigService);
    walletService = module.get(WalletService);
    unitOfWork = module.get(UnitOfWork);

    // Mock static HelperService methods
    jest
      .spyOn(HelperService, 'generateReference')
      .mockImplementation(
        ({ prefix }: { prefix?: string }) => `${prefix}_123456`,
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyWithdrawal', () => {
    it('should update transaction to COMPLETED for successful transfer', async () => {
      const transferRef = '123456';
      const mockTransaction = {
        id: 1,
        external_reference: transferRef,
        status: 'PENDING',
        wallet_id: 1,
        amount: new Decimal(100),
        currency: 'USD',
      };
      const mockTrx = {} as Knex.Transaction;
      mockPaymentService.getTransfer.mockResolvedValue({
        status: 'SUCCESSFUL',
      });
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);
      mockTransactionRepository.update.mockResolvedValue(undefined);
      mockUnitOfWork.executeInTransaction.mockImplementation(
        async (fn: (trx: Knex.Transaction) => Promise<void>) =>
          await fn(mockTrx),
      );

      await service.verifyWithdrawal(transferRef);

      expect(paymentService.getTransfer).toHaveBeenCalledWith(transferRef);

      expect(transactionRepository.findOne).toHaveBeenCalledWith(
        { external_reference: transferRef },
        mockTrx,
        true,
      );

      expect(transactionRepository.update).toHaveBeenCalledWith(
        mockTransaction.id,
        { status: 'COMPLETED' },
        mockTrx,
      );
    });

    it('should throw Error for non-existent transaction', async () => {
      const transferRef = '123456';
      const mockTrx = {} as Knex.Transaction;
      mockPaymentService.getTransfer.mockResolvedValue({
        status: 'SUCCESSFUL',
      });
      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockUnitOfWork.executeInTransaction.mockImplementation(
        async (fn: (trx: Knex.Transaction) => Promise<void>) =>
          await fn(mockTrx),
      );

      await expect(service.verifyWithdrawal(transferRef)).rejects.toThrow(
        'Transfer not found',
      );

      expect(transactionRepository.findOne).toHaveBeenCalledWith(
        { external_reference: transferRef },
        mockTrx,
        true,
      );
    });

    it('should do nothing for non-PENDING transaction', async () => {
      const transferRef = '123456';
      const mockTransaction = {
        id: 1,
        external_reference: transferRef,
        status: 'COMPLETED',
        wallet_id: 1,
        amount: new Decimal(100),
        currency: 'USD',
      };
      const mockTrx = {} as Knex.Transaction;
      mockPaymentService.getTransfer.mockResolvedValue({
        status: 'SUCCESSFUL',
      });
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);
      mockUnitOfWork.executeInTransaction.mockImplementation(
        async (fn: (trx: Knex.Transaction) => Promise<void>) =>
          await fn(mockTrx),
      );

      await service.verifyWithdrawal(transferRef);

      expect(transactionRepository.update).not.toHaveBeenCalled();
    });

    it('should throw Error for PENDING or NEW transfer status', async () => {
      const transferRef = '123456';
      const mockTransaction = {
        id: 1,
        external_reference: transferRef,
        status: 'PENDING',
        wallet_id: 1,
        amount: new Decimal(100),
        currency: 'USD',
      };
      const mockTrx = {} as Knex.Transaction;
      mockPaymentService.getTransfer.mockResolvedValue({ status: 'PENDING' });
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);
      mockUnitOfWork.executeInTransaction.mockImplementation(
        async (fn: (trx: Knex.Transaction) => Promise<void>) =>
          await fn(mockTrx),
      );

      await expect(service.verifyWithdrawal(transferRef)).rejects.toThrow(
        'Transfer is still pending or new',
      );

      expect(paymentService.getTransfer).toHaveBeenCalledWith(transferRef);
    });

    it('should handle wallet reversal for FAILED transfer', async () => {
      const transferRef = '123456';
      const mockTransaction = {
        id: 1,
        external_reference: transferRef,
        status: 'PENDING',
        wallet_id: 1,
        amount: new Decimal(100),
        currency: 'USD',
        internal_reference: TransactionPrefixEnum.WITHDRAWAL + '_123',
      };
      const mockWallet = { id: 1, balance: new Decimal(500) };
      const mockTrx = {} as Knex.Transaction;
      mockPaymentService.getTransfer.mockResolvedValue({ status: 'FAILED' });
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);
      mockWalletRepository.findById.mockResolvedValue(mockWallet);
      mockTransactionRepository.update.mockResolvedValue(undefined);
      mockTransactionRepository.insert.mockResolvedValue(undefined);
      mockWalletService.depositToWallet.mockResolvedValue(undefined);
      mockUnitOfWork.executeInTransaction.mockImplementation(
        async (fn: (trx: Knex.Transaction) => Promise<void>) =>
          await fn(mockTrx),
      );

      await service.verifyWithdrawal(transferRef);

      expect(transactionRepository.update).toHaveBeenCalledWith(
        mockTransaction.id,
        { status: 'FAILED' },
        mockTrx,
      );

      expect(transactionRepository.insert).toHaveBeenCalledWith(
        {
          internal_reference: 'RF_123456',
          transaction_type: 'REFUND',
          amount: mockTransaction.amount.toNumber(),
          wallet_id: mockTransaction.wallet_id,
          external_reference: mockTransaction.internal_reference,
          status: 'COMPLETED',
          currency: mockTransaction.currency,
        },
        mockTrx,
      );

      expect(walletService.depositToWallet).toHaveBeenCalledWith(
        mockWallet,
        mockTransaction.amount,
        mockTrx,
      );
    });
  });

  describe('handleWalletReversal', () => {
    it('should perform wallet reversal successfully', async () => {
      const mockTransaction = {
        id: 1,
        wallet_id: 1,
        amount: new Decimal(100),
        currency: 'USD',
        internal_reference: TransactionPrefixEnum.WITHDRAWAL + '_123',
      } as Transaction;
      const mockWallet = { id: 1, balance: new Decimal(500) };
      const mockTrx = {} as Knex.Transaction;
      mockWalletRepository.findById.mockResolvedValue(mockWallet);
      mockTransactionRepository.update.mockResolvedValue(undefined);
      mockTransactionRepository.insert.mockResolvedValue(undefined);
      mockWalletService.depositToWallet.mockResolvedValue(undefined);

      await service.handleWalletReversal(mockTransaction, mockTrx);

      expect(walletRepository.findById).toHaveBeenCalledWith(
        mockTransaction.wallet_id,
        mockTrx,
        true,
      );

      expect(transactionRepository.update).toHaveBeenCalledWith(
        mockTransaction.id,
        { status: 'FAILED' },
        mockTrx,
      );

      expect(transactionRepository.insert).toHaveBeenCalledWith(
        {
          internal_reference: 'RF_123456',
          transaction_type: 'REFUND',
          amount: mockTransaction.amount.toNumber(),
          wallet_id: mockTransaction.wallet_id,
          external_reference: mockTransaction.internal_reference,
          status: 'COMPLETED',
          currency: mockTransaction.currency,
        },
        mockTrx,
      );

      expect(walletService.depositToWallet).toHaveBeenCalledWith(
        mockWallet,
        mockTransaction.amount,
        mockTrx,
      );
    });

    it('should throw Error if wallet not found', async () => {
      const mockTransaction = {
        id: 1,
        wallet_id: 1,
        amount: new Decimal(100),
        currency: 'USD',
      } as Transaction;
      const mockTrx = {} as Knex.Transaction;
      mockWalletRepository.findById.mockResolvedValue(null);

      await expect(
        service.handleWalletReversal(mockTransaction, mockTrx),
      ).rejects.toThrow('Wallet not found');

      expect(walletRepository.findById).toHaveBeenCalledWith(
        mockTransaction.wallet_id,
        mockTrx,
        true,
      );
    });
  });

  describe('webhookHandler', () => {
    it('should handle transfer.completed with WITHDRAWAL prefix', async () => {
      const payload = {
        event: 'transfer.completed',
        data: {
          id: 123,
          reference: `${TransactionPrefixEnum.WITHDRAWAL}_123456`,
        },
      };
      jest.spyOn(service, 'verifyWithdrawal').mockResolvedValue(undefined);

      await service.webhookHandler(payload);

      expect(service.verifyWithdrawal).toHaveBeenCalledWith('123');
    });

    it('should log warning for unhandled transfer type', async () => {
      const payload = {
        event: 'transfer.completed',
        data: {
          reference: 'UNKNOWN_123456',
        },
      };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.webhookHandler(payload);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unhandled transfer type:',
        undefined,
      );

      const verifyWithdrawalSpy = jest.spyOn(service, 'verifyWithdrawal');
      expect(verifyWithdrawalSpy).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle charge.completed with DEPOSIT prefix', async () => {
      const payload = {
        event: 'charge.completed',
        data: {
          tx_ref: `${TransactionPrefixEnum.DEPOSIT}_123456`,
        },
      };
      mockWalletService.verifyFundingPayment.mockResolvedValue(undefined);

      await service.webhookHandler(payload);

      expect(walletService.verifyFundingPayment).toHaveBeenCalledWith(
        payload.data.tx_ref,
        false,
      );
    });

    it('should handle charge.completed with BANK_TRANSFER_TRANSACTION', async () => {
      const payload = {
        event: 'charge.completed',
        'event.type': 'UNKNOWN_TYPE',
        data: {
          tx_ref: 'TXN_123456',
        },
      };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.webhookHandler(payload);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unhandled charge type:',
        payload.data.tx_ref,
      );

      expect(walletService.verifyFundingPayment).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should log warning for unhandled event type', async () => {
      const payload = {
        event: 'unknown.event',
        data: {
          tx_ref: 'TXN_123456',
        },
      };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.webhookHandler(payload);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unhandled event type:',
        payload.event,
      );
      consoleWarnSpy.mockRestore();
    });
  });
});
