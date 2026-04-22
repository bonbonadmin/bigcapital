import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('sales_invoices', (table) => {
    table.text('tags').nullable().after('terms_conditions');
  });

  await knex.schema.alterTable('sales_receipts', (table) => {
    table.text('tags').nullable().after('terms_conditions');
  });

  await knex.schema.alterTable('credit_notes', (table) => {
    table.text('tags').nullable().after('terms_conditions');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('credit_notes', (table) => {
    table.dropColumn('tags');
  });

  await knex.schema.alterTable('sales_receipts', (table) => {
    table.dropColumn('tags');
  });

  await knex.schema.alterTable('sales_invoices', (table) => {
    table.dropColumn('tags');
  });
}
