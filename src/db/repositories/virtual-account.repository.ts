import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

import { Tables } from 'knex/types/tables';
import { BaseRepository } from './base.repository';

@Injectable()
export class VirtualAccountRepository extends BaseRepository<
  Tables['virtual_accounts']
> {
  constructor(protected readonly knex: Knex<Tables['virtual_accounts']>) {
    super(knex, 'virtual_accounts');
  }
}
