import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

import { Tables } from 'knex/types/tables';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserRepository extends BaseRepository<Tables['users']> {
  constructor(protected readonly knex: Knex<Tables['users']>) {
    super(knex, 'users');
  }
}
