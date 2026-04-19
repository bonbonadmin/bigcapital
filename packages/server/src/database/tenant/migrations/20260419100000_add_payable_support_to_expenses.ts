import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('expenses_transactions', (table) => {
    table
      .integer('payable_account_id')
      .unsigned()
      .references('id')
      .inTable('accounts')
      .after('payment_account_id');
    table.decimal('payment_amount', 13, 3).defaultTo(0).after('total_amount');
    table.date('opened_at').index().after('published_at');
  });

  await knex.schema.createTable('expense_payments', (table) => {
    table.increments();
    table
      .integer('vendor_id')
      .unsigned()
      .index()
      .references('id')
      .inTable('contacts');
    table.decimal('amount', 13, 3).defaultTo(0);
    table.string('currency_code');
    table
      .integer('payment_account_id')
      .unsigned()
      .references('id')
      .inTable('accounts');
    table
      .integer('payable_account_id')
      .unsigned()
      .references('id')
      .inTable('accounts');
    table.string('payment_number').nullable().index();
    table.date('payment_date').index();
    table.string('reference');
    table.integer('user_id').unsigned().index();
    table.text('statement');
    table.decimal('exchange_rate', 13, 8).defaultTo(1);
    table.integer('branch_id').unsigned().references('id').inTable('branches');
    table.timestamps();
  });

  await knex.schema.createTable('expense_payments_entries', (table) => {
    table.increments();
    table
      .integer('expense_payment_id')
      .unsigned()
      .index()
      .references('id')
      .inTable('expense_payments');
    table
      .integer('expense_id')
      .unsigned()
      .index()
      .references('id')
      .inTable('expenses_transactions');
    table.decimal('payment_amount', 13, 3).unsigned();
    table.integer('index').unsigned();
  });

  await knex('expenses_transactions')
    .whereNotNull('payment_account_id')
    .update({
      payment_amount: knex.ref('total_amount'),
    });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('expense_payments_entries');
  await knex.schema.dropTableIfExists('expense_payments');

  await knex.schema.alterTable('expenses_transactions', (table) => {
    table.dropColumn('payable_account_id');
    table.dropColumn('payment_amount');
    table.dropColumn('opened_at');
  });
}
