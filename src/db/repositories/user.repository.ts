import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

import { Tables, User } from 'knex/types/tables';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserRepository extends BaseRepository<Tables['users']> {
  constructor(protected readonly knex: Knex<Tables['users']>) {
    super(knex, 'users');
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return await this.knex('users')
      .where({ email })
      .whereNull('deleted_at')
      .first();
  }
}
