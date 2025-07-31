import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { Knex } from 'knex';
import { SearchRequestDto } from 'src/common/dtos';
import { TransactionPrefixEnum } from 'src/common/enums';
import { HelperService } from 'src/common/services/helper.service';
import { PaymentService } from 'src/common/services/payment.service';
import { Transaction, Transfer } from 'src/db/entities';
import { TransactionRepository } from 'src/db/repositories/transaction.repository';
import { TransferRepository } from 'src/db/repositories/transfer.repository';
import { UserRepository } from 'src/db/repositories/user.repository';
import { VirtualAccountRepository } from 'src/db/repositories/virtual-account.repository';
import { WalletRepository } from 'src/db/repositories/wallet.repository';
import { UnitOfWork } from 'src/db/uow/uow';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly walletRepository: WalletRepository,
    private readonly transferRepository: TransferRepository,
    private readonly virtualAccountRepository: VirtualAccountRepository,
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
        return;
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

  async webhookHandler(payload: {
    data?: {
      id?: number;
      tx_ref?: string;
      reference?: string;
      meta_data?: {
        originatoraccountnumber?: string;
        originatorname?: string;
        bankname?: string;
      };
    };
    event?: string;
    'event.type'?: string;
  }) {
    if (
      payload.event !== 'transfer.completed' &&
      payload.event !== 'charge.completed'
    ) {
      console.warn('Unhandled event type:', payload.event);
      return;
    }

    const transactionRef = payload.data?.tx_ref;
    const externalReference = payload.data?.id?.toString();
    const transferRef = payload.data?.reference;

    if (payload.event === 'transfer.completed') {
      if (transferRef?.startsWith(TransactionPrefixEnum.WITHDRAWAL)) {
        await this.verifyWithdrawal(externalReference!);
      } else {
        console.warn('Unhandled transfer type:', transactionRef);
      }
      return;
    }

    if (payload.event === 'charge.completed') {
      if (transactionRef?.startsWith(TransactionPrefixEnum.DEPOSIT)) {
        await this.walletService.verifyFundingPayment(transactionRef, false);
      } else {
        if (payload['event.type'] === 'BANK_TRANSFER_TRANSACTION') {
          // handle virtual account transfers
          // todo: docs not clear on this
        } else {
          console.warn('Unhandled charge type:', transactionRef);
        }
      }
      return;
    }
  }

  async searchTransactions(req: SearchRequestDto) {
    try {
      const result = await this.transactionRepository.findPaged(req);
      return result;
    } catch (error) {
      console.error(error);
      HelperService.errorHandler(error, 'Failed to search transactions');
    }
  }

  async searchTransfers(req: SearchRequestDto) {
    try {
      const result = await this.transferRepository.findPaged(req);
      return result;
    } catch (error) {
      console.error(error);
      HelperService.errorHandler(error, 'Failed to search transfers');
    }
  }

  async searchVirtualAccounts(req: SearchRequestDto) {
    try {
      const result = await this.virtualAccountRepository.findPaged(req);
      return result;
    } catch (error) {
      console.error(error);
      HelperService.errorHandler(error, 'Failed to search virtual accounts');
    }
  }
}
