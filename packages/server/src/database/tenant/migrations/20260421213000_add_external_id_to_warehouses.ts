export async function up(knex) {
  return knex.schema.alterTable('warehouses', (table) => {
    table.integer('external_id').unsigned().nullable().index();
  });
}

export async function down(knex) {
  return knex.schema.alterTable('warehouses', (table) => {
    table.dropColumn('external_id');
  });
}
