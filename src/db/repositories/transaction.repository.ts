import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

import { Tables } from 'knex/types/tables';
import { BaseRepository } from './base.repository';

@Injectable()
export class TransactionRepository extends BaseRepository<
  Tables['transactions']
> {
  constructor(protected readonly knex: Knex<Tables['transactions']>) {
    super(knex, 'transactions');
  }
}
