import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { Knex } from 'knex';
import { Wallet } from 'knex/types/tables';
import { DEFAULT_CURRENCY, ONE_MINUTE_IN_MS } from 'src/common/constants';
import { TransactionPrefixEnum } from 'src/common/enums';
import { HelperService } from 'src/common/services/helper.service';
import { TransactionRepository } from 'src/db/repositories/transaction.repository';
import { TransferRepository } from 'src/db/repositories/transfer.repository';
import { UserRepository } from 'src/db/repositories/user.repository';
import { WalletRepository } from 'src/db/repositories/wallet.repository';
import { UnitOfWork } from 'src/db/uow/uow';

import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { TransactionJobsEnum } from 'src/transactions/transaction-jobs.enum';
import { PaymentService } from 'src/common/services/payment.service';
import { VirtualAccountRepository } from 'src/db/repositories/virtual-account.repository';
import { BankRepository } from 'src/db/repositories/bank.repository';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly transferRepo: TransferRepository,
    private readonly paymentService: PaymentService,
    private readonly userRepo: UserRepository,
    private readonly config: ConfigService,
    private readonly uow: UnitOfWork,
    private readonly virtualAccountRepo: VirtualAccountRepository,
    private readonly bankRepo: BankRepository,
    @InjectQueue('transactions') private readonly transactionsQueue: Queue,
  ) {}

  async handleWalletCreation(userId: number, bvn: string, phoneNumber: string) {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const reference = HelperService.generateReference();
      await this.uow.executeInTransaction(async (trx: Knex.Transaction) => {
        const walletId = await this.createWallet(userId, trx);

        const response = await this.paymentService.createVirtualAccount({
          bvn,
          phoneNumber,
          reference,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
        });

        const bank = await this.bankRepo.findOne({
          bank_name: response.bankName,
        });

        await this.virtualAccountRepo.insert(
          {
            bank_code: bank ? bank.bank_code : null,
            bank_name: response.bankName,
            account_number: response.accountNumber,
            wallet_id: walletId,
            bvn,
            phone_number: phoneNumber,
            expiry_date:
              response.expiryDate == 'N/A'
                ? null
                : new Date(response.expiryDate),
            reference: response.reference,
          },
          trx,
        );
      });
    } catch (error) {
      HelperService.errorHandler(error, 'Failed to create wallet');
    }
  }

  async createWallet(userId: number, trx?: Knex.Transaction) {
    return await this.walletRepository.insert(
      {
        user_id: userId,
        balance: 0,
        is_active: true,
        currency: DEFAULT_CURRENCY,
      },
      trx,
    );
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
          callbackUrl: `${this.config.get<string>('FRONTEND_URL')}/wallet`,
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

  async verifyFundingPayment(reference: string, throwError = true) {
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

    if (transaction.status === 'FAILED') {
      if (throwError) {
        throw new BadRequestException('Payment already failed');
      } else {
        return { error: 'Payment already failed' };
      }
    }

    const wallet = await this.findById(transaction.wallet_id);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    try {
      const response =
        await this.paymentService.verifyTransactionBySystemRef(reference);

      if (response.status === 'failed') {
        await this.transactionRepo.update(transaction.id, {
          status: 'FAILED',
          external_reference: response.externalRef,
        });
        if (throwError) {
          throw new BadRequestException('Payment failed');
        } else {
          return { error: 'Payment failed' };
        }
      }

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
      HelperService.errorHandler(error, 'Failed to verify payment');
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

    await this.walletTransfer(fromWallet, toWallet, amount, description);
  }

  async walletWithdrawal(
    userId: number,
    amount: number,
    bankCode: string,
    accountNumber: string,
    fail: boolean = false,
    delay: number = 1,
  ) {
    const [failure, success] = ['_PMCK_ST_F', '_PMCK'];
    let suffix = '';

    if (this.config.get<string>('NODE_ENV') !== 'production') {
      if (fail) {
        suffix = `${failure}DU_${delay}`;
      } else {
        suffix = `${success}DU_${delay}`;
      }
    }

    const wallet = await this.findByUserId(userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const reference = HelperService.generateReference({
      prefix: TransactionPrefixEnum.WITHDRAWAL,
      suffix,
    });

    await this.paymentService.verifyAccount({
      accountNumber,
      bankCode,
    });

    const response = await this.paymentService.initiateTransfer({
      accountNumber,
      bankCode,
      amount,
      reference,
      narration: `Withdrawal from wallet ${wallet.id}`,
      currency: wallet.currency,
    });

    try {
      await this.uow.executeInTransaction(async (trx: Knex.Transaction) => {
        await this.transactionRepo.insert(
          {
            wallet_id: wallet.id,
            amount: amount,
            transaction_type: 'WITHDRAWAL',
            status: 'PENDING',
            currency: wallet.currency,
            internal_reference: reference,
            external_reference: response.externalRef,
          },
          trx,
        );

        await this.withdrawFromWallet(wallet, new Decimal(amount), trx);
      });

      await this.transactionsQueue.add(
        TransactionJobsEnum.VerifyWithdrawal,
        {
          transferRef: response.externalRef,
        },
        {
          delay: ONE_MINUTE_IN_MS * 1,
          attempts: 10,
          backoff: {
            type: 'exponential',
            delay: ONE_MINUTE_IN_MS * 2,
          },
        },
      );

      return response;
    } catch (error) {
      console.error('Error during wallet withdrawal:', error);
      HelperService.errorHandler(error, 'Failed to withdraw funds');
    }
  }

  async walletTransfer(
    fromWallet: Wallet,
    toWallet: Wallet,
    amount: number,
    description?: string,
  ) {
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

        await this.transferRepo.insert(
          {
            from_wallet_id: fromWallet.id,
            to_wallet_id: toWallet.id,
            amount: amount,
            from_transaction_id: transferOutTransaction,
            to_transaction_id: transferInTransaction,
            currency: fromWallet.currency,
            description: description || null,
          },
          trx,
        );

        await this.withdrawFromWallet(fromWallet, new Decimal(amount), trx);
        await this.depositToWallet(toWallet, new Decimal(amount), trx);
      });
    } catch (error) {
      console.error('Error during wallet transfer:', error);
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
