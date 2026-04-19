import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('withholding_taxes', (table) => {
    table.increments();
    table.string('name').notNullable();
    table.decimal('rate', 13, 5).notNullable();
    table.text('description').nullable();
    table
      .integer('account_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('accounts');
    table.timestamps();
  });

  await knex.schema.alterTable('expenses_transactions', (table) => {
    table
      .integer('withholding_tax_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('withholding_taxes')
      .after('payable_account_id');
    table.string('withholding_tax_name').nullable().after('withholding_tax_id');
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
      .after('payment_amount');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('expenses_transactions', (table) => {
    table.dropColumn('withholding_tax_id');
    table.dropColumn('withholding_tax_name');
    table.dropColumn('withholding_tax_rate');
    table.dropColumn('withholding_tax_account_id');
    table.dropColumn('withholding_tax_amount');
  });

  await knex.schema.dropTableIfExists('withholding_taxes');
}
