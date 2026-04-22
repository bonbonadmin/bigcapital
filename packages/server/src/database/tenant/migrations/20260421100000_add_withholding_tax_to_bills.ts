import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('bills', (table) => {
    table
      .integer('withholding_tax_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('withholding_taxes')
      .after('sales_tax_rate_id');
    table
      .string('withholding_tax_name')
      .nullable()
      .after('withholding_tax_id');
    table
      .decimal('withholding_tax_rate', 13, 5)
      .nullable()
      .after('withholding_tax_name');
    table
      .integer('withholding_tax_account_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('accounts')
      .after('withholding_tax_rate');
    table
      .decimal('withholding_tax_amount', 13, 3)
      .defaultTo(0)
      .after('sales_tax_amount');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('bills', (table) => {
    table.dropColumn('withholding_tax_id');
    table.dropColumn('withholding_tax_name');
    table.dropColumn('withholding_tax_rate');
    table.dropColumn('withholding_tax_account_id');
    table.dropColumn('withholding_tax_amount');
  });
}
