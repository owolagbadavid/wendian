import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('banks', function (table) {
    table.increments('id').primary();
    table.string('bank_code', 10).notNullable().unique();
    table.string('bank_name', 100).notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable().defaultTo(null);
  });

  await knex.schema.createTable('virtual_accounts', function (table) {
    table.increments('id').primary();
    table.integer('wallet_id').unsigned().notNullable();
    table.foreign('wallet_id').references('wallets.id').onDelete('CASCADE');
    table.string('bank_code', 10).nullable();
    table.string('bank_name', 100).nullable();
    table.string('account_number').notNullable();
    table.string('bvn').notNullable();
    table.string('phone_number').notNullable();
    table.string('reference').notNullable();
    table.timestamp('expiry_date').nullable().defaultTo(null);
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable().defaultTo(null);
    table.index('wallet_id', 'idx_virtual_accounts_wallet_id');
    table.index('bank_code', 'idx_virtual_accounts_bank_code');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('virtual_accounts');
  await knex.schema.dropTableIfExists('banks');
}
