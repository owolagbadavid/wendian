import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { Knex } from 'knex';
import { Wallet } from 'knex/types/tables';
import { DEFAULT_CURRENCY } from 'src/common/constants';
import { TransactionPrefixEnum } from 'src/common/enums';
import { FlutterwaveService } from 'src/common/services/flutterwave.service';
import { HelperService } from 'src/common/services/helper.service';
import { TransactionRepository } from 'src/db/repositories/transaction.repository';
import { TransferRepository } from 'src/db/repositories/transfer.repository';
import { UserRepository } from 'src/db/repositories/user.repository';
import { WalletRepository } from 'src/db/repositories/wallet.repository';
import { UnitOfWork } from 'src/db/uow/uow';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly transferRepo: TransferRepository,
    private readonly paymentService: FlutterwaveService,
    private readonly userRepo: UserRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async createWallet(userId: number) {
    return await this.walletRepository.insert({
      user_id: userId,
      balance: 0,
      is_active: true,
      currency: DEFAULT_CURRENCY,
    });
  }

  async findByUserId(userId: number) {
    return await this.walletRepository.findOne({ user_id: userId });
  }

  async findById(walletId: number) {
    const wallet = await this.walletRepository.findById(walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  async fundWallet(userId: number, amount: number) {
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const reference = HelperService.generateReference({
      prefix: TransactionPrefixEnum.DEPOSIT,
    });

    try {
      const response = await this.paymentService.initiatePayment(
        {
          amount,
          fullName: user.email,
          email: user.email,
          currency: wallet.currency,
          callbackUrl: 'https://localhost:3000/wallet/callback',
        },
        reference,
      );

      await this.transactionRepo.insert({
        internal_reference: reference,
        wallet_id: wallet.id,
        amount: amount,
        transaction_type: 'DEPOSIT',
        status: 'PENDING',
        currency: wallet.currency,
        external_reference: null,
      });

      return response;
    } catch (error) {
      console.error('Error initiating payment:', error);
      HelperService.errorHandler(error, 'Failed to initiate payment');
    }
  }

  async verifyPayment(userId: number, reference: string) {
    const transaction = await this.transactionRepo.findOne({
      internal_reference: reference,
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const successResponse = {
      amount: transaction.amount,
      currency: transaction.currency,
    };

    if (transaction.status === 'COMPLETED') {
      // transaction already verified
      return successResponse;
    }

    const wallet = await this.findById(transaction.wallet_id);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    try {
      const response =
        await this.paymentService.verifyTransactionBySystemRef(reference);

      if (
        response.status !== 'successful' ||
        !transaction.amount.equals(response.amount) ||
        response.currency !== transaction.currency
      ) {
        throw new BadRequestException('Could not verify payment');
      }

      await this.uow.executeInTransaction(async (trx: Knex.Transaction) => {
        await this.depositToWallet(wallet, transaction.amount, trx);
        await this.transactionRepo.update(
          transaction.id,
          {
            status: 'COMPLETED',
            external_reference: response.externalRef,
          },
          trx,
        );
      });

      return successResponse;
    } catch (error) {
      HelperService.errorHandler(error);
    }
  }

  async handleWalletTransfer(
    fromUserId: number,
    toUsername: string,
    amount: number,
    description?: string,
  ) {
    const fromWallet = await this.findByUserId(fromUserId);
    const toWallet = await this.userRepo
      .findOne({
        username: toUsername,
      })
      .then((user) => {
        if (!user) {
          throw new NotFoundException('Recipient user not found');
        }
        return this.findByUserId(user.id);
      });

    if (!toWallet || !fromWallet) {
      throw new NotFoundException('Wallet not found for one of the users');
    }

    await this.walletTransfer(fromWallet.id, toWallet.id, amount, description);
  }

  async walletTransfer(
    fromWalletId: number,
    toWalletId: number,
    amount: number,
    description?: string,
  ) {
    const fromWallet = await this.findById(fromWalletId);
    const toWallet = await this.findById(toWalletId);

    if (fromWallet.currency !== toWallet.currency) {
      throw new BadRequestException('Wallets must have the same currency');
    }

    if (fromWallet.balance.lessThan(amount)) {
      throw new BadRequestException('Insufficient balance');
    }

    try {
      await this.uow.executeInTransaction(async (trx: Knex.Transaction) => {
        const transferOutTransaction = await this.transactionRepo.insert(
          {
            wallet_id: fromWallet.id,
            amount: amount,
            transaction_type: 'TRANSFER_OUT',
            status: 'COMPLETED',
            currency: fromWallet.currency,
            internal_reference: HelperService.generateReference({
              prefix: TransactionPrefixEnum.TRANSFER,
            }),
            external_reference: null,
          },
          trx,
        );

        const transferInTransaction = await this.transactionRepo.insert(
          {
            wallet_id: toWallet.id,
            amount: amount,
            transaction_type: 'TRANSFER_IN',
            status: 'COMPLETED',
            currency: toWallet.currency,
            internal_reference: HelperService.generateReference({
              prefix: TransactionPrefixEnum.TRANSFER,
            }),
            external_reference: null,
          },
          trx,
        );

        const transfer = await this.transferRepo.insert(
          {
            from_wallet_id: fromWallet.id,
            to_wallet_id: toWallet.id,
            amount: amount,
            from_transaction_id: transferOutTransaction.id,
            to_transaction_id: transferInTransaction.id,
            currency: fromWallet.currency,
            description: description || null,
          },
          trx,
        );

        await this.withdrawFromWallet(fromWallet, transfer.amount, trx);
        await this.depositToWallet(toWallet, transfer.amount, trx);
      });
    } catch (error) {
      HelperService.errorHandler(error, 'Failed to transfer funds');
    }
  }

  async depositToWallet(
    wallet: Wallet,
    amount: Decimal,
    trx: Knex.Transaction,
  ) {
    if (amount.lessThan(0)) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    await this.walletRepository.update(
      wallet.id,
      {
        balance: wallet.balance.add(amount).toNumber(),
      },
      trx,
    );
  }

  async withdrawFromWallet(
    wallet: Wallet,
    amount: Decimal,
    trx: Knex.Transaction,
  ) {
    if (amount.lessThan(0)) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    if (wallet.balance.lessThan(amount)) {
      throw new BadRequestException('Insufficient balance');
    }

    await this.walletRepository.update(
      wallet.id,
      {
        balance: wallet.balance.sub(amount).toNumber(),
      },
      trx,
    );
  }
}
