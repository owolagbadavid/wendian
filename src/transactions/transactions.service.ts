import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Knex } from 'knex';
import { TransactionPrefixEnum } from 'src/common/enums';
import { HelperService } from 'src/common/services/helper.service';
import { PaymentService } from 'src/common/services/payment.service';
import { Transaction } from 'src/db/entities';
import { TransactionRepository } from 'src/db/repositories/transaction.repository';
import { TransferRepository } from 'src/db/repositories/transfer.repository';
import { UserRepository } from 'src/db/repositories/user.repository';
import { WalletRepository } from 'src/db/repositories/wallet.repository';
import { UnitOfWork } from 'src/db/uow/uow';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly walletRepository: WalletRepository,
    private readonly transferRepository: TransferRepository,
    private readonly userRepository: UserRepository,
    private readonly paymentService: PaymentService,
    private readonly config: ConfigService,
    private readonly walletService: WalletService,
    private readonly uow: UnitOfWork,
  ) {}

  async verifyWithdrawal(transferRef: string) {
    const response = await this.paymentService.getTransfer(transferRef);

    await this.uow.executeInTransaction(async (trx: Knex.Transaction) => {
      const transaction = await this.transactionRepository.findOne(
        {
          external_reference: transferRef,
        },
        trx,
        true, // forUpdate to lock the row
      );

      if (!transaction) {
        throw new Error('Transfer not found');
      }

      if (transaction.status !== 'PENDING') {
        throw new Error('Transfer already verified or completed');
      }

      if (response.status == 'SUCCESSFUL') {
        // mark the transaction as completed
        await this.transactionRepository.update(
          transaction.id,
          {
            status: 'COMPLETED',
          },
          trx,
        );
        return;
      }

      if (response.status == 'NEW' || response.status == 'PENDING') {
        throw new Error('Transfer is still pending or new');
      }

      if (response.status == 'FAILED') {
        // handler wallet reversal
        await this.handleWalletReversal(transaction, trx);
      }
    }, {});
  }

  async handleWalletReversal(transaction: Transaction, trx: Knex.Transaction) {
    const wallet = await this.walletRepository.findById(
      transaction.wallet_id,
      trx,
      true, // forUpdate to lock the row
    );
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    await this.transactionRepository.update(
      transaction.id,
      {
        status: 'FAILED',
      },
      trx,
    );

    await this.transactionRepository.insert(
      {
        internal_reference: HelperService.generateReference({
          prefix: TransactionPrefixEnum.REFUND,
        }),
        transaction_type: 'REFUND',
        amount: transaction.amount.toNumber(),
        wallet_id: transaction.wallet_id,
        external_reference: transaction.internal_reference,
        status: 'COMPLETED',
        currency: transaction.currency,
      },
      trx,
    );

    await this.walletService.depositToWallet(wallet, transaction.amount, trx);
  }
}
