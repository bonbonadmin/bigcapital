exports.up = function (knex) {
  return knex.schema.createTable('BILL_IMAGE', (table) => {
    table.increments('ID');
    table.text('S3_LINK', 'longtext').notNullable();
    table
      .integer('BANK_ACCOUNT_ID')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('accounts');
    table
      .integer('AP_ID')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('accounts');
    table.text('OCR_TEXT', 'longtext').nullable();
    table.text('BILL_DATA', 'longtext').nullable();
    table.string('OCR_STATUS').notNullable().defaultTo('pending');
    table.string('MAPPING_STATUS').notNullable().defaultTo('pending');
    table.string('PUBLISH_STATUS').notNullable().defaultTo('pending');
    table.datetime('OCR_PROCESSED_AT').nullable();
    table.datetime('MAPPING_PROCESSED_AT').nullable();
    table.datetime('PUBLISH_AT').nullable();
    table.text('LAST_ERROR', 'longtext').nullable();
    table.datetime('CREATED_AT').notNullable();
    table.datetime('UPDATED_AT').notNullable();

    table.index(['BANK_ACCOUNT_ID']);
    table.index(['AP_ID']);
    table.index(['OCR_STATUS']);
    table.index(['MAPPING_STATUS']);
    table.index(['PUBLISH_STATUS']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('BILL_IMAGE');
};
