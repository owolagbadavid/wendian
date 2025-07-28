import type { Knex } from 'knex';

// Valid transaction types
const TRANSACTION_TYPES = [
  'DEPOSIT',
  'WITHDRAWAL',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'REFUND',
];
// Valid transaction statuses
const TRANSACTION_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'];

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('wallets', function (table) {
    table.increments('id').primary();
    table.integer('user_id').notNullable().unsigned();
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.decimal('balance', 15, 2).defaultTo(0.0);
    table.string('currency', 3).defaultTo('NGN');
    table.boolean('is_active').defaultTo(true);
    table.unique('user_id');
    table.check('balance >= 0');
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable().defaultTo(null);
    table.index('user_id', 'idx_wallets_user_id');
  });

  await knex.schema.createTable('transactions', function (table) {
    table.increments('id').primary();
    table.integer('wallet_id').notNullable().unsigned();
    table.foreign('wallet_id').references('wallets.id').onDelete('CASCADE');
    table
      .string('transaction_type', 20)
      .notNullable()
      .checkIn(TRANSACTION_TYPES);
    table.decimal('amount', 15, 2).notNullable();
    table.string('currency', 3).defaultTo('NGN');
    table
      .string('status', 20)
      .notNullable()
      .defaultTo('PENDING')
      .checkIn(TRANSACTION_STATUSES);
    table
      .string('external_reference', 100)
      .nullable()
      .comment('External reference (e.g., bank or payment gateway reference)');
    table
      .string('internal_reference', 100)
      .nullable()
      .comment('Internal reference for tracking');
    table.check('amount > 0');
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable().defaultTo(null);
    table.index('wallet_id', 'idx_transactions_wallet_id');
  });

  await knex.schema.createTable('transfers', function (table) {
    table.increments('id').primary();
    table.integer('from_wallet_id').notNullable().unsigned();
    table.integer('to_wallet_id').notNullable().unsigned();
    table
      .foreign('from_wallet_id')
      .references('wallets.id')
      .onDelete('CASCADE');
    table.foreign('to_wallet_id').references('wallets.id').onDelete('CASCADE');
    table.decimal('amount', 15, 2).notNullable();
    table.string('currency', 3).defaultTo('NGN');
    table
      .string('status', 20)
      .notNullable()
      .defaultTo('PENDING')
      .checkIn(TRANSACTION_STATUSES);
    table.text('description').nullable();
    table.decimal('fee', 15, 2).defaultTo(0.0);
    table.integer('from_transaction_id').unsigned().nullable();
    table.integer('to_transaction_id').unsigned().nullable();
    table
      .foreign('from_transaction_id')
      .references('transactions.id')
      .onDelete('SET NULL');
    table
      .foreign('to_transaction_id')
      .references('transactions.id')
      .onDelete('SET NULL');
    table.check('from_wallet_id != to_wallet_id');
    table.check('amount > 0');
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable().defaultTo(null);
    table.index(['from_wallet_id', 'to_wallet_id'], 'idx_transfers_wallets');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transfers');
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('wallets');
}
