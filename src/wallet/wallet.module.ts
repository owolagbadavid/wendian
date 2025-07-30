import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

import { FlutterwaveService } from 'src/common/services/flutterwave.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  controllers: [WalletController],
  providers: [WalletService, FlutterwaveService],
  exports: [WalletService],
  imports: [
    BullModule.registerQueue({
      prefix: 'bull:{transactions}',
      name: 'transactions',
    }),
  ],
})
export class WalletModule {}
