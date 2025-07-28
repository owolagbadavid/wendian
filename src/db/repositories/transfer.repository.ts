import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

import { Tables } from 'knex/types/tables';
import { BaseRepository } from './base.repository';

@Injectable()
export class TransferRepository extends BaseRepository<Tables['transfers']> {
  constructor(protected readonly knex: Knex<Tables['transfers']>) {
    super(knex, 'transfers');
  }
}
