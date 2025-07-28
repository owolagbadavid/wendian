import { Global, Module } from '@nestjs/common';
import knex, { Knex } from 'knex';
import knexConfig from '../../knexfile';

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
  providers: [knexProvider],
  exports: [PROVIDER_NAME],
})
export class KnexModule {}
