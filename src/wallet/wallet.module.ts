import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

import { FlutterwaveService } from 'src/common/services/flutterwave.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService, FlutterwaveService],
  exports: [WalletService],
})
export class WalletModule {}
