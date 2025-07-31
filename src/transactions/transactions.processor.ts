import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { TransactionJobsEnum } from './transaction-jobs.enum';
import { TransactionsService } from './transactions.service';

@Processor('transactions')
export class TransactionsProcessor extends WorkerHost {
  private logger: Logger;
  constructor(private transactionService: TransactionsService) {
    super();
    this.logger = new Logger(TransactionsProcessor.name);
  }

  async process(job: Job) {
    switch (job.name) {
      case TransactionJobsEnum.VerifyWithdrawal as string: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const transferRef = job.data.transferRef as string;
        await this.transactionService.verifyWithdrawal(transferRef);
        break;
      }
      case TransactionJobsEnum.VerifyDeposit as string: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const reference = job.data.reference as string;
        await this.transactionService.verifyFunding(reference);
        break;
      }
    }
  }
}
