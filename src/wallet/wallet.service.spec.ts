/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { WalletRepository } from 'src/db/repositories/wallet.repository';
import { TransactionRepository } from 'src/db/repositories/transaction.repository';
import { TransferRepository } from 'src/db/repositories/transfer.repository';
import { UserRepository } from 'src/db/repositories/user.repository';
import { UnitOfWork } from 'src/db/uow/uow';
import { PaymentService } from 'src/common/services/payment.service';
import { BankRepository } from 'src/db/repositories/bank.repository';
import { VirtualAccountRepository } from 'src/db/repositories/virtual-account.repository';
import { DEFAULT_CURRENCY, ONE_MINUTE_IN_MS } from 'src/common/constants';
import { HelperService } from 'src/common/services/helper.service';
import { TransactionJobsEnum } from 'src/transactions/transaction-jobs.enum';
import { Wallet } from 'src/db/entities';
import { Knex } from 'knex';
import { TransactionPrefixEnum } from 'src/common/enums';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepository: jest.Mocked<WalletRepository>;
  let transactionRepo: jest.Mocked<TransactionRepository>;
  let transferRepo: jest.Mocked<TransferRepository>;
  let userRepo: jest.Mocked<UserRepository>;
  let paymentService: jest.Mocked<PaymentService>;
  let configService: jest.Mocked<ConfigService>;
  let unitOfWork: jest.Mocked<UnitOfWork>;
  let virtualAccountRepo: jest.Mocked<VirtualAccountRepository>;
  let bankRepo: jest.Mocked<BankRepository>;
  let transactionsQueue: jest.Mocked<Queue>;

  const mockWalletRepository = {
    insert: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockTransactionRepo = {
    insert: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockTransferRepo = {
    insert: jest.fn(),
  };

  const mockUserRepo = {
    findById: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPaymentService = {
    createVirtualAccount: jest.fn(),
    initiatePayment: jest.fn(),
    verifyAccount: jest.fn(),
    initiateTransfer: jest.fn(),
    verifyTransactionBySystemRef: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockUnitOfWork = {
    executeInTransaction: jest.fn(),
  };

  const mockVirtualAccountRepo = {
    insert: jest.fn(),
  };

  const mockBankRepo = {
    findOne: jest.fn(),
  };

  const mockTransactionsQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: WalletRepository,
          useValue: mockWalletRepository,
        },
        {
          provide: TransactionRepository,
          useValue: mockTransactionRepo,
        },
        {
          provide: TransferRepository,
          useValue: mockTransferRepo,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepo,
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
          provide: UnitOfWork,
          useValue: mockUnitOfWork,
        },
        {
          provide: VirtualAccountRepository,
          useValue: mockVirtualAccountRepo,
        },
        {
          provide: BankRepository,
          useValue: mockBankRepo,
        },
        {
          provide: 'BullQueue_transactions',
          useValue: mockTransactionsQueue,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepository = module.get(WalletRepository);
    transactionRepo = module.get(TransactionRepository);
    transferRepo = module.get(TransferRepository);
    userRepo = module.get(UserRepository);
    paymentService = module.get(PaymentService);
    configService = module.get(ConfigService);
    unitOfWork = module.get(UnitOfWork);
    virtualAccountRepo = module.get(VirtualAccountRepository);
    bankRepo = module.get(BankRepository);
    transactionsQueue = module.get('BullQueue_transactions');

    // Mock static HelperService methods
    jest
      .spyOn(HelperService, 'generateReference')
      .mockImplementation(
        ({ prefix, suffix } = {}) =>
          `${prefix ? `${prefix}_` : ''}123456${suffix || ''}`,
      );
    jest.spyOn(HelperService, 'errorHandler').mockImplementation((error) => {
      throw error;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleWalletCreation', () => {
    it('should create wallet and virtual account successfully', async () => {
      const userId = 1;
      const bvn = '12345678901';
      const phoneNumber = '1234567890';
      const mockUser = {
        id: userId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'test@example.com',
      };
      const mockWalletId = 1;
      const mockVirtualAccount = {
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        reference: 'REF_123456',
        expiryDate: 'N/A',
      };
      const mockBank = { bank_code: '001' };
      const mockTrx = {} as Knex.Transaction;
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockWalletRepository.insert.mockResolvedValue(mockWalletId);
      mockPaymentService.createVirtualAccount.mockResolvedValue(
        mockVirtualAccount,
      );
      mockBankRepo.findOne.mockResolvedValue(mockBank);
      mockVirtualAccountRepo.insert.mockResolvedValue(undefined);
      mockUnitOfWork.executeInTransaction.mockImplementation(
        async (fn: (trx: Knex.Transaction) => Promise<void>) => fn(mockTrx),
      );

      await service.handleWalletCreation(userId, bvn, phoneNumber);

      expect(userRepo.findById).toHaveBeenCalledWith(userId);
      expect(walletRepository.insert).toHaveBeenCalledWith(
        {
          user_id: userId,
          balance: 0,
          is_active: true,
          currency: DEFAULT_CURRENCY,
        },
        mockTrx,
      );
      expect(paymentService.createVirtualAccount).toHaveBeenCalledWith({
        bvn,
        phoneNumber,
        reference: '123456',
        firstName: mockUser.first_name,
        lastName: mockUser.last_name,
        email: mockUser.email,
      });
      expect(bankRepo.findOne).toHaveBeenCalledWith({
        bank_name: mockVirtualAccount.bankName,
      });
      expect(virtualAccountRepo.insert).toHaveBeenCalledWith(
        {
          bank_code: mockBank.bank_code,
          bank_name: mockVirtualAccount.bankName,
          account_number: mockVirtualAccount.accountNumber,
          wallet_id: mockWalletId,
          bvn,
          phone_number: phoneNumber,
          expiry_date: null,
          reference: mockVirtualAccount.reference,
        },
        mockTrx,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 1;
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(
        service.handleWalletCreation(userId, '12345678901', '1234567890'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.handleWalletCreation(userId, '12345678901', '1234567890'),
      ).rejects.toThrow('User not found');
    });

    it('should handle payment service errors', async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'test@example.com',
      };
      const error = new Error('Payment service error');
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockPaymentService.createVirtualAccount.mockRejectedValue(error);

      await expect(
        service.handleWalletCreation(userId, '12345678901', '1234567890'),
      ).rejects.toThrow('Payment service error');
    });
  });

  describe('createWallet', () => {
    it('should create wallet successfully', async () => {
      const userId = 1;
      const mockWalletId = 1;
      const mockTrx = {} as Knex.Transaction;
      mockWalletRepository.insert.mockResolvedValue(mockWalletId);

      const result = await service.createWallet(userId, mockTrx);
      expect(result).toBe(mockWalletId);
      expect(walletRepository.insert).toHaveBeenCalledWith(
        {
          user_id: userId,
          balance: 0,
          is_active: true,
          currency: DEFAULT_CURRENCY,
        },
        mockTrx,
      );
    });
  });

  describe('findByUserId', () => {
    it('should return wallet for user', async () => {
      const userId = 1;
      const mockWallet = {
        id: 1,
        user_id: userId,
        balance: new Decimal(100),
        currency: DEFAULT_CURRENCY,
      };
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);

      const result = await service.findByUserId(userId);
      expect(result).toEqual(mockWallet);
      expect(walletRepository.findOne).toHaveBeenCalledWith({
        user_id: userId,
      });
    });

    it('should return null if wallet not found', async () => {
      const userId = 1;
      mockWalletRepository.findOne.mockResolvedValue(null);

      const result = await service.findByUserId(userId);
      expect(result).toBeNull();
      expect(walletRepository.findOne).toHaveBeenCalledWith({
        user_id: userId,
      });
    });
  });

  describe('findById', () => {
    it('should return wallet by ID', async () => {
      const walletId = 1;
      const mockWallet = {
        id: walletId,
        user_id: 1,
        balance: new Decimal(100),
        currency: DEFAULT_CURRENCY,
      };
      mockWalletRepository.findById.mockResolvedValue(mockWallet);

      const result = await service.findById(walletId);
      expect(result).toEqual(mockWallet);
      expect(walletRepository.findById).toHaveBeenCalledWith(walletId);
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const walletId = 1;
      mockWalletRepository.findById.mockResolvedValue(null);

      await expect(service.findById(walletId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById(walletId)).rejects.toThrow(
        'Wallet not found',
      );
      expect(walletRepository.findById).toHaveBeenCalledWith(walletId);
    });
  });

  describe('fundWallet', () => {
    it('should initiate payment successfully', async () => {
      const userId = 1;
      const amount = 100;
      const mockWallet = {
        id: 1,
        user_id: userId,
        balance: new Decimal(0),
        currency: DEFAULT_CURRENCY,
      };
      const mockUser = { id: userId, email: 'test@example.com' };
      const mockPaymentResponse = { paymentUrl: 'https://payment.com' };
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockPaymentService.initiatePayment.mockResolvedValue(mockPaymentResponse);
      mockTransactionRepo.insert.mockResolvedValue(undefined);
      mockConfigService.get.mockReturnValue('http://frontend.com');

      const result = await service.fundWallet(userId, amount);
      expect(result).toEqual(mockPaymentResponse);
      expect(walletRepository.findOne).toHaveBeenCalledWith({
        user_id: userId,
      });
      expect(userRepo.findById).toHaveBeenCalledWith(userId);
      expect(paymentService.initiatePayment).toHaveBeenCalledWith(
        {
          amount,
          fullName: mockUser.email,
          email: mockUser.email,
          currency: mockWallet.currency,
          callbackUrl: 'http://frontend.com/wallet',
        },
        'DP_123456',
      );
      expect(transactionRepo.insert).toHaveBeenCalledWith({
        internal_reference: 'DP_123456',
        wallet_id: mockWallet.id,
        amount,
        transaction_type: 'DEPOSIT',
        status: 'PENDING',
        currency: mockWallet.currency,
        external_reference: null,
      });
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = 1;
      mockWalletRepository.findOne.mockResolvedValue(null);

      await expect(service.fundWallet(userId, 100)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.fundWallet(userId, 100)).rejects.toThrow(
        'Wallet not found',
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 1;
      const mockWallet = {
        id: 1,
        user_id: userId,
        balance: new Decimal(0),
        currency: DEFAULT_CURRENCY,
      };
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.fundWallet(userId, 100)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.fundWallet(userId, 100)).rejects.toThrow(
        'User not found',
      );
    });

    it('should handle payment initiation errors', async () => {
      const userId = 1;
      const mockWallet = {
        id: 1,
        user_id: userId,
        balance: new Decimal(0),
        currency: DEFAULT_CURRENCY,
      };
      const mockUser = { id: userId, email: 'test@example.com' };
      const error = new Error('Payment initiation failed');
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockPaymentService.initiatePayment.mockRejectedValue(error);

      await expect(service.fundWallet(userId, 100)).rejects.toThrow(
        'Payment initiation failed',
      );
    });
  });

  describe('verifyFundingPayment', () => {
    it('should verify and complete payment successfully', async () => {
      const reference = 'DEPOSIT_123456';
      const mockTransaction = {
        id: 1,
        wallet_id: 1,
        amount: new Decimal(100),
        currency: DEFAULT_CURRENCY,
        status: 'PENDING',
      };
      const mockWallet = {
        id: 1,
        balance: new Decimal(0),
        currency: DEFAULT_CURRENCY,
      };
      const mockResponse = {
        status: 'successful',
        amount: new Decimal(100),
        currency: DEFAULT_CURRENCY,
        externalRef: 'EXT_123',
      };
      const mockTrx = {} as Knex.Transaction;
      mockTransactionRepo.findOne.mockResolvedValue(mockTransaction);
      mockWalletRepository.findById.mockResolvedValue(mockWallet);
      mockPaymentService.verifyTransactionBySystemRef.mockResolvedValue(
        mockResponse,
      );
      mockTransactionRepo.update.mockResolvedValue(undefined);
      mockWalletRepository.update.mockResolvedValue(undefined);
      mockUnitOfWork.executeInTransaction.mockImplementation(
        async (fn: (trx: Knex.Transaction) => Promise<void>) => fn(mockTrx),
      );

      const result = await service.verifyFundingPayment(reference);
      expect(result).toEqual({
        amount: mockTransaction.amount,
        currency: mockTransaction.currency,
      });
      expect(transactionRepo.findOne).toHaveBeenCalledWith({
        internal_reference: reference,
      });
      expect(walletRepository.findById).toHaveBeenCalledWith(
        mockTransaction.wallet_id,
        mockTrx,
        true,
      );
      expect(paymentService.verifyTransactionBySystemRef).toHaveBeenCalledWith(
        reference,
      );
      expect(walletRepository.update).toHaveBeenCalledWith(
        mockWallet.id,
        { balance: mockWallet.balance.add(mockTransaction.amount).toNumber() },
        mockTrx,
      );
      expect(transactionRepo.update).toHaveBeenCalledWith(
        mockTransaction.id,
        { status: 'COMPLETED', external_reference: mockResponse.externalRef },
        mockTrx,
      );
    });

    it('should return early for COMPLETED transaction', async () => {
      const reference = 'DEPOSIT_123456';
      const mockTransaction = {
        id: 1,
        wallet_id: 1,
        amount: new Decimal(100),
        currency: DEFAULT_CURRENCY,
        status: 'COMPLETED',
      };
      mockTransactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.verifyFundingPayment(reference);
      expect(result).toEqual({
        amount: mockTransaction.amount,
        currency: mockTransaction.currency,
      });
      expect(
        paymentService.verifyTransactionBySystemRef,
      ).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for FAILED transaction with throwError=true', async () => {
      const reference = 'DEPOSIT_123456';
      const mockTransaction = {
        id: 1,
        wallet_id: 1,
        amount: new Decimal(100),
        currency: DEFAULT_CURRENCY,
        status: 'FAILED',
      };
      mockTransactionRepo.findOne.mockResolvedValue(mockTransaction);

      await expect(service.verifyFundingPayment(reference)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyFundingPayment(reference)).rejects.toThrow(
        'Payment already failed',
      );
    });

    it('should return error for FAILED transaction with throwError=false', async () => {
      const reference = 'DEPOSIT_123456';
      const mockTransaction = {
        id: 1,
        wallet_id: 1,
        amount: new Decimal(100),
        currency: DEFAULT_CURRENCY,
        status: 'FAILED',
      };
      mockTransactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.verifyFundingPayment(reference, false);
      expect(result).toEqual({ error: 'Payment already failed' });
    });

    it('should throw NotFoundException if transaction not found', async () => {
      const reference = 'DEPOSIT_123456';
      mockTransactionRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyFundingPayment(reference)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.verifyFundingPayment(reference)).rejects.toThrow(
        'Transaction not found',
      );
    });

    it('should throw BadRequestException for failed payment', async () => {
      const reference = 'DEPOSIT_123456';
      const mockTransaction = {
        id: 1,
        wallet_id: 1,
        amount: new Decimal(100),
        currency: DEFAULT_CURRENCY,
        status: 'PENDING',
      };
      const mockWallet = {
        id: 1,
        balance: new Decimal(0),
        currency: DEFAULT_CURRENCY,
      };
      const mockResponse = { status: 'failed', externalRef: 'EXT_123' };
      mockTransactionRepo.findOne.mockResolvedValue(mockTransaction);
      mockWalletRepository.findById.mockResolvedValue(mockWallet);
      mockPaymentService.verifyTransactionBySystemRef.mockResolvedValue(
        mockResponse,
      );
      mockTransactionRepo.update.mockResolvedValue(undefined);

      await expect(service.verifyFundingPayment(reference)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyFundingPayment(reference)).rejects.toThrow(
        'Payment failed',
      );
      expect(transactionRepo.update).toHaveBeenCalledWith(mockTransaction.id, {
        status: 'FAILED',
        external_reference: mockResponse.externalRef,
      });
    });

    it('should throw BadRequestException for invalid payment details', async () => {
      const reference = 'DEPOSIT_123456';
      const mockTransaction = {
        id: 1,
        wallet_id: 1,
        amount: new Decimal(100),
        currency: DEFAULT_CURRENCY,
        status: 'PENDING',
      };
      const mockWallet = {
        id: 1,
        balance: new Decimal(0),
        currency: DEFAULT_CURRENCY,
      };
      const mockResponse = {
        status: 'successful',
        amount: new Decimal(200),
        currency: DEFAULT_CURRENCY,
        externalRef: 'EXT_123',
      };
      mockTransactionRepo.findOne.mockResolvedValue(mockTransaction);
      mockWalletRepository.findById.mockResolvedValue(mockWallet);
      mockPaymentService.verifyTransactionBySystemRef.mockResolvedValue(
        mockResponse,
      );

      await expect(service.verifyFundingPayment(reference)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyFundingPayment(reference)).rejects.toThrow(
        'Could not verify payment',
      );
    });
  });

  describe('handleWalletTransfer', () => {
    it('should transfer between wallets successfully', async () => {
      const fromUserId = 1;
      const toUsername = 'recipient';
      const amount = 100;
      const mockFromWallet = {
        id: 1,
        user_id: fromUserId,
        balance: new Decimal(200),
        currency: DEFAULT_CURRENCY,
      };
      const mockToUser = { id: 2, username: toUsername };
      const mockToWallet = {
        id: 2,
        user_id: mockToUser.id,
        balance: new Decimal(0),
        currency: DEFAULT_CURRENCY,
      };
      mockWalletRepository.findOne
        .mockResolvedValueOnce(mockFromWallet)
        .mockResolvedValueOnce(mockToWallet);
      mockUserRepo.findOne.mockResolvedValue(mockToUser);
      jest.spyOn(service, 'walletTransfer').mockResolvedValue(undefined);

      await service.handleWalletTransfer(fromUserId, toUsername, amount);
      expect(walletRepository.findOne).toHaveBeenCalledWith({
        user_id: fromUserId,
      });
      expect(userRepo.findOne).toHaveBeenCalledWith({ username: toUsername });
      expect(walletRepository.findOne).toHaveBeenCalledWith({
        user_id: mockToUser.id,
      });
      expect(service.walletTransfer).toHaveBeenCalledWith(
        mockFromWallet,
        mockToWallet,
        amount,
        undefined,
      );
    });

    it('should throw NotFoundException if from wallet not found', async () => {
      const fromUserId = 1;
      mockWalletRepository.findOne.mockResolvedValue(null);

      await expect(
        service.handleWalletTransfer(fromUserId, 'recipient', 100),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.handleWalletTransfer(fromUserId, 'recipient', 100),
      ).rejects.toThrow('Wallet not found for one of the users');
    });

    it('should throw NotFoundException if recipient user not found', async () => {
      const fromUserId = 1;
      const mockFromWallet = {
        id: 1,
        user_id: fromUserId,
        balance: new Decimal(200),
        currency: DEFAULT_CURRENCY,
      };
      mockWalletRepository.findOne.mockResolvedValue(mockFromWallet);
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.handleWalletTransfer(fromUserId, 'recipient', 100),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.handleWalletTransfer(fromUserId, 'recipient', 100),
      ).rejects.toThrow('Recipient user not found');
    });

    it('should throw NotFoundException if to wallet not found', async () => {
      const fromUserId = 1;
      const mockFromWallet = {
        id: 1,
        user_id: fromUserId,
        balance: new Decimal(200),
        currency: DEFAULT_CURRENCY,
      };
      const mockToUser = { id: 2, username: 'recipient' };
      mockWalletRepository.findOne
        .mockResolvedValueOnce(mockFromWallet)
        .mockResolvedValueOnce(null);
      mockUserRepo.findOne.mockResolvedValue(mockToUser);

      mockWalletRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.handleWalletTransfer(fromUserId, 'recipient', 100),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.handleWalletTransfer(fromUserId, 'recipient', 100),
      ).rejects.toThrow('Wallet not found for one of the users');
    });
  });

  describe('walletWithdrawal', () => {
    it('should initiate withdrawal successfully in production', async () => {
      const userId = 1;
      const amount = 100;
      const bankCode = '001';
      const accountNumber = '1234567890';
      const mockWallet = {
        id: 1,
        user_id: userId,
        balance: new Decimal(200),
        currency: DEFAULT_CURRENCY,
      };
      const mockResponse = { externalRef: 'EXT_123' };
      const mockTrx = {} as Knex.Transaction;
      mockConfigService.get.mockReturnValue('production');
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockPaymentService.verifyAccount.mockResolvedValue(undefined);
      mockPaymentService.initiateTransfer.mockResolvedValue(mockResponse);
      mockTransactionRepo.insert.mockResolvedValue(undefined);
      mockWalletRepository.update.mockResolvedValue(undefined);
      mockTransactionsQueue.add.mockResolvedValue(undefined);
      mockUnitOfWork.executeInTransaction.mockImplementation(
        async (fn: (trx: Knex.Transaction) => Promise<void>) => fn(mockTrx),
      );

      const result = await service.walletWithdrawal(
        userId,
        amount,
        bankCode,
        accountNumber,
      );
      expect(result).toEqual(mockResponse);
      expect(walletRepository.findOne).toHaveBeenCalledWith({
        user_id: userId,
      });
      expect(paymentService.verifyAccount).toHaveBeenCalledWith({
        accountNumber,
        bankCode,
      });
      expect(paymentService.initiateTransfer).toHaveBeenCalledWith({
        accountNumber,
        bankCode,
        amount,
        reference: 'WD_123456',
        narration: `Withdrawal from wallet ${mockWallet.id}`,
        currency: mockWallet.currency,
      });
      expect(transactionRepo.insert).toHaveBeenCalledWith(
        {
          wallet_id: mockWallet.id,
          amount,
          transaction_type: 'WITHDRAWAL',
          status: 'PENDING',
          currency: mockWallet.currency,
          internal_reference: 'WD_123456',
          external_reference: mockResponse.externalRef,
        },
        mockTrx,
      );
      expect(walletRepository.update).toHaveBeenCalledWith(
        mockWallet.id,
        { balance: mockWallet.balance.sub(amount).toNumber() },
        mockTrx,
      );
      expect(transactionsQueue.add).toHaveBeenCalledWith(
        TransactionJobsEnum.VerifyWithdrawal,
        { transferRef: mockResponse.externalRef },
        {
          delay: ONE_MINUTE_IN_MS * 1,
          attempts: 10,
          backoff: { type: 'exponential', delay: ONE_MINUTE_IN_MS * 2 },
        },
      );
    });

    it('should initiate withdrawal with failure suffix in non-production', async () => {
      const userId = 1;
      const amount = 100;
      const bankCode = '001';
      const accountNumber = '1234567890';
      const mockWallet = {
        id: 1,
        user_id: userId,
        balance: new Decimal(200),
        currency: DEFAULT_CURRENCY,
      };
      const mockResponse = { externalRef: 'EXT_123' };
      const mockTrx = {} as Knex.Transaction;
      mockConfigService.get.mockReturnValue('development');
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockPaymentService.verifyAccount.mockResolvedValue(undefined);
      mockPaymentService.initiateTransfer.mockResolvedValue(mockResponse);
      mockTransactionRepo.insert.mockResolvedValue(undefined);
      mockWalletRepository.update.mockResolvedValue(undefined);
      mockTransactionsQueue.add.mockResolvedValue(undefined);
      mockUnitOfWork.executeInTransaction.mockImplementation(
        async (fn: (trx: Knex.Transaction) => Promise<void>) => fn(mockTrx),
      );

      const result = await service.walletWithdrawal(
        userId,
        amount,
        bankCode,
        accountNumber,
        true,
        2,
      );
      expect(result).toEqual(mockResponse);
      expect(paymentService.initiateTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: 'WD_123456_PMCK_ST_FDU_2',
        }),
      );
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = 1;
      mockWalletRepository.findOne.mockResolvedValue(null);

      await expect(
        service.walletWithdrawal(userId, 100, '001', '1234567890'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.walletWithdrawal(userId, 100, '001', '1234567890'),
      ).rejects.toThrow('Wallet not found');
    });

    it('should handle transfer initiation errors', async () => {
      const userId = 1;
      const mockWallet = {
        id: 1,
        user_id: userId,
        balance: new Decimal(200),
        currency: DEFAULT_CURRENCY,
      };
      const error = new Error('Transfer initiation failed');
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockPaymentService.verifyAccount.mockResolvedValue(undefined);
      mockPaymentService.initiateTransfer.mockRejectedValue(error);

      await expect(
        service.walletWithdrawal(userId, 100, '001', '1234567890'),
      ).rejects.toThrow('Transfer initiation failed');
    });
  });

  describe('walletTransfer', () => {
    it('should transfer funds between wallets successfully', async () => {
      const fromWallet = {
        id: 1,
        balance: new Decimal(200),
        currency: DEFAULT_CURRENCY,
      } as Wallet;
      const toWallet = {
        id: 2,
        balance: new Decimal(0),
        currency: DEFAULT_CURRENCY,
      } as Wallet;
      const amount = 100;
      const mockTrx = {} as Knex.Transaction;
      const mockTransferOutId = 1;
      const mockTransferInId = 2;
      mockTransactionRepo.insert
        .mockResolvedValueOnce(mockTransferOutId)
        .mockResolvedValueOnce(mockTransferInId);
      mockTransferRepo.insert.mockResolvedValue(undefined);
      mockWalletRepository.update.mockResolvedValue(undefined);
      mockUnitOfWork.executeInTransaction.mockImplementation(
        async (fn: (trx: Knex.Transaction) => Promise<void>) => fn(mockTrx),
      );

      await service.walletTransfer(
        fromWallet,
        toWallet,
        amount,
        'Test transfer',
      );
      expect(transactionRepo.insert).toHaveBeenCalledWith(
        {
          wallet_id: fromWallet.id,
          amount,
          transaction_type: 'TRANSFER_OUT',
          status: 'COMPLETED',
          currency: fromWallet.currency,
          internal_reference: 'TR_123456',
          external_reference: null,
        },
        mockTrx,
      );
      expect(transactionRepo.insert).toHaveBeenCalledWith(
        {
          wallet_id: toWallet.id,
          amount,
          transaction_type: 'TRANSFER_IN',
          status: 'COMPLETED',
          currency: toWallet.currency,
          internal_reference: 'TR_123456',
          external_reference: null,
        },
        mockTrx,
      );
      expect(transferRepo.insert).toHaveBeenCalledWith(
        {
          from_wallet_id: fromWallet.id,
          to_wallet_id: toWallet.id,
          amount,
          from_transaction_id: mockTransferOutId,
          to_transaction_id: mockTransferInId,
          currency: fromWallet.currency,
          description: 'Test transfer',
        },
        mockTrx,
      );
      expect(walletRepository.update).toHaveBeenCalledWith(
        fromWallet.id,
        { balance: fromWallet.balance.sub(amount).toNumber() },
        mockTrx,
      );
      expect(walletRepository.update).toHaveBeenCalledWith(
        toWallet.id,
        { balance: toWallet.balance.add(amount).toNumber() },
        mockTrx,
      );
    });

    it('should throw BadRequestException for different currencies', async () => {
      const fromWallet = {
        id: 1,
        balance: new Decimal(200),
        currency: 'USD',
      } as Wallet;
      const toWallet = {
        id: 2,
        balance: new Decimal(0),
        currency: 'NGN',
      } as Wallet;

      await expect(
        service.walletTransfer(fromWallet, toWallet, 100),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.walletTransfer(fromWallet, toWallet, 100),
      ).rejects.toThrow('Wallets must have the same currency');
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      const fromWallet = {
        id: 1,
        balance: new Decimal(50),
        currency: DEFAULT_CURRENCY,
      } as Wallet;
      const toWallet = {
        id: 2,
        balance: new Decimal(0),
        currency: DEFAULT_CURRENCY,
      } as Wallet;

      await expect(
        service.walletTransfer(fromWallet, toWallet, 100),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.walletTransfer(fromWallet, toWallet, 100),
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('depositToWallet', () => {
    it('should deposit funds successfully', async () => {
      const wallet = {
        id: 1,
        balance: new Decimal(100),
        currency: DEFAULT_CURRENCY,
      } as Wallet;
      const amount = new Decimal(50);
      const mockTrx = {} as Knex.Transaction;
      mockWalletRepository.update.mockResolvedValue(undefined);

      await service.depositToWallet(wallet, amount, mockTrx);
      expect(walletRepository.update).toHaveBeenCalledWith(
        wallet.id,
        { balance: wallet.balance.add(amount).toNumber() },
        mockTrx,
      );
    });

    it('should throw BadRequestException for negative amount', async () => {
      const wallet = {
        id: 1,
        balance: new Decimal(100),
        currency: DEFAULT_CURRENCY,
      } as Wallet;
      const amount = new Decimal(-50);
      const mockTrx = {} as Knex.Transaction;

      await expect(
        service.depositToWallet(wallet, amount, mockTrx),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.depositToWallet(wallet, amount, mockTrx),
      ).rejects.toThrow('Amount must be greater than zero');
    });
  });

  describe('withdrawFromWallet', () => {
    it('should withdraw funds successfully', async () => {
      const wallet = {
        id: 1,
        balance: new Decimal(100),
        currency: DEFAULT_CURRENCY,
      } as Wallet;
      const amount = new Decimal(50);
      const mockTrx = {} as Knex.Transaction;
      mockWalletRepository.update.mockResolvedValue(undefined);

      await service.withdrawFromWallet(wallet, amount, mockTrx);
      expect(walletRepository.update).toHaveBeenCalledWith(
        wallet.id,
        { balance: wallet.balance.sub(amount).toNumber() },
        mockTrx,
      );
    });

    it('should throw BadRequestException for negative amount', async () => {
      const wallet = {
        id: 1,
        balance: new Decimal(100),
        currency: DEFAULT_CURRENCY,
      } as Wallet;
      const amount = new Decimal(-50);
      const mockTrx = {} as Knex.Transaction;

      await expect(
        service.withdrawFromWallet(wallet, amount, mockTrx),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.withdrawFromWallet(wallet, amount, mockTrx),
      ).rejects.toThrow('Amount must be greater than zero');
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      const wallet = {
        id: 1,
        balance: new Decimal(50),
        currency: DEFAULT_CURRENCY,
      } as Wallet;
      const amount = new Decimal(100);
      const mockTrx = {} as Knex.Transaction;

      await expect(
        service.withdrawFromWallet(wallet, amount, mockTrx),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.withdrawFromWallet(wallet, amount, mockTrx),
      ).rejects.toThrow('Insufficient balance');
    });
  });
});
