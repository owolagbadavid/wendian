import { Global, Module } from '@nestjs/common';
import knex, { Knex } from 'knex';
import knexConfig from '../../knexfile';
import { UnitOfWork } from './uow/uow';

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
  ],
  exports: [
    PROVIDER_NAME,
    {
      provide: UnitOfWork,
      useFactory: (knex: Knex) => new UnitOfWork(knex),
      inject: [knexProvider.provide],
    },
  ],
})
export class KnexModule {}
