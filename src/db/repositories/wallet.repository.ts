import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

import { Tables } from 'knex/types/tables';
import { BaseRepository } from './base.repository';

@Injectable()
export class WalletRepository extends BaseRepository<Tables['wallets']> {
  constructor(protected readonly knex: Knex<Tables['wallets']>) {
    super(knex, 'wallets');
  }
}
