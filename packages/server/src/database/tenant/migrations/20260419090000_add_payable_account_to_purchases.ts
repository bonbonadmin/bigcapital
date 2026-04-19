/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('bills', (table) => {
    table
      .integer('payable_account_id')
      .unsigned()
      .nullable()
      .index()
      .references('id')
      .inTable('accounts')
      .after('vendor_id');
  });

  await knex.schema.alterTable('vendor_credits', (table) => {
    table
      .integer('payable_account_id')
      .unsigned()
      .nullable()
      .index()
      .references('id')
      .inTable('accounts')
      .after('vendor_id');
  });

  await knex.schema.alterTable('bills_payments', (table) => {
    table
      .integer('payable_account_id')
      .unsigned()
      .nullable()
      .index()
      .references('id')
      .inTable('accounts')
      .after('payment_account_id');
  });

  const payableAccounts = await knex('accounts')
    .select('id', 'currency_code')
    .where('account_type', 'accounts-payable')
    .orderBy('id', 'asc');

  if (payableAccounts.length === 0) {
    return;
  }

  const defaultPayableAccountId = payableAccounts[0].id;
  const payableAccountsByCurrency = payableAccounts.reduce((acc, account) => {
    const currencyCode = account.currency_code || '__default__';

    if (!acc.has(currencyCode)) {
      acc.set(currencyCode, account.id);
    }
    return acc;
  }, new Map());

  const backfillPayableAccount = async (tableName) => {
    const records = await knex(tableName)
      .select('id', 'currency_code')
      .whereNull('payable_account_id');

    const idsByPayableAccountId = records.reduce((acc, record) => {
      const payableAccountId =
        payableAccountsByCurrency.get(record.currency_code || '__default__') ||
        defaultPayableAccountId;

      if (!payableAccountId) {
        return acc;
      }
      if (!acc.has(payableAccountId)) {
        acc.set(payableAccountId, []);
      }
      acc.get(payableAccountId).push(record.id);
      return acc;
    }, new Map());

    for (const [payableAccountId, ids] of idsByPayableAccountId.entries()) {
      await knex(tableName).whereIn('id', ids).update({
        payable_account_id: payableAccountId,
      });
    }
  };

  await backfillPayableAccount('bills');
  await backfillPayableAccount('vendor_credits');
  await backfillPayableAccount('bills_payments');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('bills_payments', (table) => {
    table.dropColumn('payable_account_id');
  });

  await knex.schema.alterTable('vendor_credits', (table) => {
    table.dropColumn('payable_account_id');
  });

  await knex.schema.alterTable('bills', (table) => {
    table.dropColumn('payable_account_id');
  });
};
