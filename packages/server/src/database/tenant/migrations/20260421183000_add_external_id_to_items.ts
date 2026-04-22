exports.up = function (knex) {
  return knex.schema.table('items', (table) => {
    table.integer('external_id').unsigned().nullable().index();
  });
};

exports.down = function (knex) {
  return knex.schema.table('items', (table) => {
    table.dropColumn('external_id');
  });
};
