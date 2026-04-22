export async function up(knex) {
  return knex.schema.alterTable('contacts', (table) => {
    table.integer('external_id').unsigned().nullable().index();
  });
}

export async function down(knex) {
  return knex.schema.alterTable('contacts', (table) => {
    table.dropColumn('external_id');
  });
}
