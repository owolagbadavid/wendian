import { Global, Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { FlutterwaveService } from 'src/common/services/flutterwave.service';
import { TransactionsProcessor } from './transactions.processor';
import { WalletService } from 'src/wallet/wallet.service';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    FlutterwaveService,
    TransactionsProcessor,
    WalletService,
  ],
  imports: [
    BullModule.registerQueue({
      prefix: 'bull:{transactions}',
      name: 'transactions',
    }),
  ],
})
export class TransactionsModule {}
