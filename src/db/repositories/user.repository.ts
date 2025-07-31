import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

import { Tables } from 'knex/types/tables';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserRepository extends BaseRepository<Tables['users']> {
  constructor(protected readonly knex: Knex<Tables['users']>) {
    super(knex, 'users');
  }

  async getSummary({ fromDate, toDate }: { fromDate: Date; toDate: Date }) {
    const usersByStatus = await this.knex<Tables['users']>('users')
      .select('status')
      .count<{ status: string; count: number }[]>({ count: '*' })
      .whereBetween('created_at', [fromDate, toDate])
      .groupBy('status')
      .orderBy('status');

    const transactionsByStatus = await this.knex<Tables['transactions']>(
      'transactions',
    )
      .select('status')
      .count<{ status: string; count: number }[]>({ count: '*' })
      .whereBetween('created_at', [fromDate, toDate])
      .groupBy('status')
      .orderBy('status');

    const totalWallets = await this.knex<Tables['wallets']>('wallets')
      .count<{ count: number }>({ count: '*' })
      .whereBetween('created_at', [fromDate, toDate])
      .first();

    const totalTransfers = await this.knex<Tables['transfers']>('transfers')
      .count<{ count: number }>({ count: '*' })
      .whereBetween('created_at', [fromDate, toDate])
      .first();

    const totalVirtualAccounts = await this.knex<Tables['virtual_accounts']>(
      'virtual_accounts',
    )
      .count<{ count: number }>({ count: '*' })
      .whereBetween('created_at', [fromDate, toDate])
      .first();

    return {
      usersByStatus,
      transactionsByStatus,
      totalWallets: totalWallets?.count || 0,
      totalTransfers: totalTransfers?.count || 0,
      totalVirtualAccounts: totalVirtualAccounts?.count || 0,
    };
  }
}
