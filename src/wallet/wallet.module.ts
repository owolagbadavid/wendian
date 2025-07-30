import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

import { FlutterwaveService } from 'src/common/services/flutterwave.service';
import { BullModule } from '@nestjs/bullmq';
import { PaymentService } from 'src/common/services/payment.service';

@Module({
  controllers: [WalletController],
  providers: [
    WalletService,
    {
      provide: PaymentService,
      useClass: FlutterwaveService,
    },
  ],
  exports: [WalletService],
  imports: [
    BullModule.registerQueue({
      prefix: 'bull:{transactions}',
      name: 'transactions',
    }),
  ],
})
export class WalletModule {}
