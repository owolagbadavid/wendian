import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class UnitOfWork {
  constructor(private readonly knex: Knex) {}

  /**
   * Starts a transaction and returns the trx instance.
   */
  async startTransaction(): Promise<Knex.Transaction> {
    return this.knex.transaction();
  }

  /**
   * Creates a transaction provider for deferred or reusable transactions.
   */
  createTransactionProvider(): () => Promise<Knex.Transaction> {
    return this.knex.transactionProvider();
  }

  /**
   * Executes a series of queries inside a transaction with auto commit/rollback.
   */
  async executeInTransaction<T>(
    fn: (trx: Knex.Transaction) => Promise<T>,
    options?: Knex.TransactionConfig,
  ): Promise<T> {
    const trx = await this.knex.transaction(options);
    try {
      const result = await fn(trx);
      await trx.commit();
      return result;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
}
