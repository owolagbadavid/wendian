import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();

    table.string('email', 50).notNullable().unique();
    table.text('password_hash').notNullable();
    table.boolean('is_email_verified').notNullable().defaultTo(false);
    table.timestamp('email_verified_at').nullable().defaultTo(null);
    table.string('status').notNullable();
    table.string('role').notNullable();

    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable().defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user');
}
