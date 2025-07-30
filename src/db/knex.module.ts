/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Global, Module } from '@nestjs/common';
import knex, { Knex } from 'knex';
import knexConfig from '../../knexfile';
import { UnitOfWork } from './uow/uow';
import { WalletRepository } from './repositories/wallet.repository';
import { TransactionRepository } from './repositories/transaction.repository';
import { UserRepository } from './repositories/user.repository';
import { TransferRepository } from './repositories/transfer.repository';
import { VirtualAccountRepository } from './repositories/virtual-account.repository';
import { BankRepository } from './repositories/bank.repository';

export const PROVIDER_NAME = 'KNEX_CONNECTION';

export const knexProvider = {
  provide: PROVIDER_NAME,
  useFactory: (): Knex => {
    const environment = process.env.NODE_ENV || 'development';
    const config = knexConfig[environment];
    return knex(config);
  },
};

@Global()
@Module({
  providers: [
    knexProvider,
    {
      provide: UnitOfWork,
      useFactory: (knex: Knex) => new UnitOfWork(knex),
      inject: [knexProvider.provide],
    },
    {
      provide: WalletRepository,
      useFactory: (knex: Knex) => new WalletRepository(knex),
      inject: [knexProvider.provide],
    },
    {
      provide: TransactionRepository,
      useFactory: (knex: Knex) => new TransactionRepository(knex),
      inject: [knexProvider.provide],
    },
    {
      provide: UserRepository,
      useFactory: (knex: Knex) => new UserRepository(knex),
      inject: [knexProvider.provide],
    },
    {
      provide: TransferRepository,
      useFactory: (knex: Knex) => new TransferRepository(knex),
      inject: [knexProvider.provide],
    },
    {
      provide: VirtualAccountRepository,
      useFactory: (knex: Knex) => new VirtualAccountRepository(knex),
      inject: [knexProvider.provide],
    },
    {
      provide: BankRepository,
      useFactory: (knex: Knex) => new BankRepository(knex),
      inject: [knexProvider.provide],
    },
  ],
  exports: [
    knexProvider.provide,
    UnitOfWork,
    WalletRepository,
    TransactionRepository,
    UserRepository,
    TransferRepository,
    VirtualAccountRepository,
    BankRepository,
  ],
})
export class KnexModule {}
