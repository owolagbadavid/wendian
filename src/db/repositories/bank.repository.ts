import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

import { Tables } from 'knex/types/tables';
import { BaseRepository } from './base.repository';

@Injectable()
export class BankRepository extends BaseRepository<Tables['banks']> {
  constructor(protected readonly knex: Knex<Tables['banks']>) {
    super(knex, 'banks');
  }
}
