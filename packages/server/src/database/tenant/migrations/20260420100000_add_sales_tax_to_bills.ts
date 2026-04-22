import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('bills', (table) => {
    table
      .integer('sales_tax_rate_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('tax_rates')
      .after('payable_account_id');
    table.string('sales_tax_name').nullable().after('sales_tax_rate_id');
    table
      .decimal('sales_tax_rate', 13, 5)
      .nullable()
      .after('sales_tax_name');
    table
      .integer('sales_tax_account_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('accounts')
      .after('sales_tax_rate');
    table
      .decimal('sales_tax_amount', 13, 3)
      .defaultTo(0)
      .after('adjustment');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('bills', (table) => {
    table.dropColumn('sales_tax_rate_id');
    table.dropColumn('sales_tax_name');
    table.dropColumn('sales_tax_rate');
    table.dropColumn('sales_tax_account_id');
    table.dropColumn('sales_tax_amount');
  });
}
