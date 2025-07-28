import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { WalletRepository } from 'src/db/repositories/wallet.repository';
import { knexProvider } from 'src/db/knex.module';
import { Knex } from 'knex';
import { FlutterwaveService } from 'src/common/services/flutterwave.service';
import { UserRepository } from 'src/db/repositories/user.repository';

@Module({
  controllers: [WalletController],
  providers: [
    WalletService,
    FlutterwaveService,
    {
      provide: WalletRepository,
      useFactory: (knex: Knex) => new WalletRepository(knex),
      inject: [knexProvider.provide],
    },
    {
      provide: UserRepository,
      useFactory: (knex: Knex) => new UserRepository(knex),
      inject: [knexProvider.provide],
    },
  ],
  exports: [WalletService, WalletRepository],
})
export class WalletModule {}
