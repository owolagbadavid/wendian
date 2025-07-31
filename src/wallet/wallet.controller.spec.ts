/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { AuthGuard } from 'src/auth/guards';
import {
  FundWalletDto,
  VerifyPaymentDto,
  WalletTransferDto,
  WalletWithdrawalDto,
} from './dtos/wallet.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WalletController', () => {
  let controller: WalletController;
  let walletService: jest.Mocked<WalletService>;

  const mockWalletService = {
    fundWallet: jest.fn(),
    verifyFundingPayment: jest.fn(),
    handleWalletTransfer: jest.fn(),
    walletWithdrawal: jest.fn(),
  };

  const mockAuthGuard = jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<WalletController>(WalletController);
    walletService = module.get(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fundWallet', () => {
    it('should call fundWallet with parsed userId and amount', async () => {
      const userId = '1';
      const body: FundWalletDto = { amount: '100.50' };
      const mockResponse = { paymentUrl: 'https://payment.com' };
      mockWalletService.fundWallet.mockResolvedValue(mockResponse);

      const result = await controller.fundWallet(userId, body);

      expect(result).toEqual(mockResponse);
      expect(walletService.fundWallet).toHaveBeenCalledWith(1, 100.5);

      expect(walletService.fundWallet).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if amount is invalid', async () => {
      const userId = '1';
      const body: FundWalletDto = { amount: 'invalid' };
      mockWalletService.fundWallet.mockImplementation(() => {
        throw new BadRequestException('Invalid amount');
      });

      await expect(controller.fundWallet(userId, body)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.fundWallet(userId, body)).rejects.toThrow(
        'Invalid amount',
      );
      expect(walletService.fundWallet).toHaveBeenCalledWith(1, NaN);
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = '1';
      const body: FundWalletDto = { amount: '100.50' };
      mockWalletService.fundWallet.mockImplementation(() => {
        throw new NotFoundException('Wallet not found');
      });

      await expect(controller.fundWallet(userId, body)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.fundWallet(userId, body)).rejects.toThrow(
        'Wallet not found',
      );
      expect(walletService.fundWallet).toHaveBeenCalledWith(1, 100.5);
    });
  });

  describe('verifyPayment', () => {
    it('should call verifyFundingPayment with reference', async () => {
      const userId = '1';
      const body: VerifyPaymentDto = { reference: 'DEPOSIT_123456' };
      const mockResponse = { amount: 100, currency: 'NGN' };
      mockWalletService.verifyFundingPayment.mockResolvedValue(mockResponse);

      const result = await controller.verifyPayment(userId, body);

      expect(result).toEqual(mockResponse);
      expect(walletService.verifyFundingPayment).toHaveBeenCalledWith(
        body.reference,
      );

      expect(walletService.verifyFundingPayment).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      const userId = '1';
      const body: VerifyPaymentDto = { reference: 'DEPOSIT_123456' };
      mockWalletService.verifyFundingPayment.mockImplementation(() => {
        throw new NotFoundException('Transaction not found');
      });

      await expect(controller.verifyPayment(userId, body)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.verifyPayment(userId, body)).rejects.toThrow(
        'Transaction not found',
      );
      expect(walletService.verifyFundingPayment).toHaveBeenCalledWith(
        body.reference,
      );
    });

    it('should throw BadRequestException if payment failed', async () => {
      const userId = '1';
      const body: VerifyPaymentDto = { reference: 'DEPOSIT_123456' };
      mockWalletService.verifyFundingPayment.mockImplementation(() => {
        throw new BadRequestException('Payment failed');
      });

      await expect(controller.verifyPayment(userId, body)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.verifyPayment(userId, body)).rejects.toThrow(
        'Payment failed',
      );
      expect(walletService.verifyFundingPayment).toHaveBeenCalledWith(
        body.reference,
      );
    });
  });

  describe('transferFunds', () => {
    it('should call handleWalletTransfer with parsed userId, toUsername, amount, and description', async () => {
      const userId = '1';
      const body: WalletTransferDto = {
        toUsername: 'recipient',
        amount: '100.50',
        description: 'Test transfer',
      };
      const mockResponse = { success: true };
      mockWalletService.handleWalletTransfer.mockResolvedValue(mockResponse);

      const result = await controller.transferFunds(userId, body);

      expect(result).toEqual(mockResponse);
      expect(walletService.handleWalletTransfer).toHaveBeenCalledWith(
        1,
        body.toUsername,
        100.5,
        body.description,
      );

      expect(walletService.handleWalletTransfer).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if recipient user not found', async () => {
      const userId = '1';
      const body: WalletTransferDto = {
        toUsername: 'recipient',
        amount: '100.50',
      };
      mockWalletService.handleWalletTransfer.mockImplementation(() => {
        throw new NotFoundException('Recipient user not found');
      });

      await expect(controller.transferFunds(userId, body)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.transferFunds(userId, body)).rejects.toThrow(
        'Recipient user not found',
      );
      expect(walletService.handleWalletTransfer).toHaveBeenCalledWith(
        1,
        body.toUsername,
        100.5,
        undefined,
      );
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      const userId = '1';
      const body: WalletTransferDto = {
        toUsername: 'recipient',
        amount: '100.50',
      };
      mockWalletService.handleWalletTransfer.mockImplementation(() => {
        throw new BadRequestException('Insufficient balance');
      });

      await expect(controller.transferFunds(userId, body)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.transferFunds(userId, body)).rejects.toThrow(
        'Insufficient balance',
      );
      expect(walletService.handleWalletTransfer).toHaveBeenCalledWith(
        1,
        body.toUsername,
        100.5,
        undefined,
      );
    });
  });

  describe('withdrawFunds', () => {
    it('should call walletWithdrawal with parsed userId, amount, bankCode, and accountNumber', async () => {
      const userId = '1';
      const body: WalletWithdrawalDto = {
        amount: '100.50',
        bankCode: '001',
        accountNumber: '1234567890',
      };
      const mockResponse = { externalRef: 'EXT_123' };
      mockWalletService.walletWithdrawal.mockResolvedValue(mockResponse);

      const result = await controller.withdrawFunds(userId, body);

      expect(result).toEqual(mockResponse);
      expect(walletService.walletWithdrawal).toHaveBeenCalledWith(
        1,
        100.5,
        body.bankCode,
        body.accountNumber,
      );

      expect(walletService.walletWithdrawal).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = '1';
      const body: WalletWithdrawalDto = {
        amount: '100.50',
        bankCode: '001',
        accountNumber: '1234567890',
      };
      mockWalletService.walletWithdrawal.mockImplementation(() => {
        throw new NotFoundException('Wallet not found');
      });

      await expect(controller.withdrawFunds(userId, body)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.withdrawFunds(userId, body)).rejects.toThrow(
        'Wallet not found',
      );
      expect(walletService.walletWithdrawal).toHaveBeenCalledWith(
        1,
        100.5,
        body.bankCode,
        body.accountNumber,
      );
    });

    it('should throw BadRequestException for invalid account', async () => {
      const userId = '1';
      const body: WalletWithdrawalDto = {
        amount: '100.50',
        bankCode: '001',
        accountNumber: '1234567890',
      };
      mockWalletService.walletWithdrawal.mockImplementation(() => {
        throw new BadRequestException('Invalid account');
      });

      await expect(controller.withdrawFunds(userId, body)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.withdrawFunds(userId, body)).rejects.toThrow(
        'Invalid account',
      );
      expect(walletService.walletWithdrawal).toHaveBeenCalledWith(
        1,
        100.5,
        body.bankCode,
        body.accountNumber,
      );
    });
  });
});
