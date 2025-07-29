import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Knex } from 'knex';
import { Wallet } from 'knex/types/tables';
import { DEFAULT_CURRENCY } from 'src/common/constants';
import { TransactionPrefixEnum } from 'src/common/enums';
import { FlutterwaveService } from 'src/common/services/flutterwave.service';
import { HelperService } from 'src/common/services/helper.service';
import { TransactionRepository } from 'src/db/repositories/transaction.repository';
import { UserRepository } from 'src/db/repositories/user.repository';
import { WalletRepository } from 'src/db/repositories/wallet.repository';
import { UnitOfWork } from 'src/db/uow/uow';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepo: TransactionRepository,
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
        amount,
        transaction_type: 'DEPOSIT',
        status: 'PENDING',
        currency: wallet.currency,
        external_reference: null,
      });

      return response;
    } catch (error) {
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
        response.amount !== Number(transaction.amount) ||
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

  async depositToWallet(wallet: Wallet, amount: number, trx: Knex.Transaction) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    await this.walletRepository.update(
      wallet.id,
      {
        balance: Number(wallet.balance) + Number(amount),
      },
      trx,
    );
  }

  async withdrawFromWallet(
    wallet: Wallet,
    amount: number,
    trx: Knex.Transaction,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    if (Number(wallet.balance) < Number(amount)) {
      throw new BadRequestException('Insufficient balance');
    }

    await this.walletRepository.update(
      wallet.id,
      {
        balance: Number(wallet.balance) - Number(amount),
      },
      trx,
    );
  }
}
