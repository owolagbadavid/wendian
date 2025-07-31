import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('username', 50).nullable().unique();
    table.string('first_name', 50).notNullable();
    table.string('last_name', 50).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('username');
    table.dropColumn('first_name');
    table.dropColumn('last_name');
  });
}
