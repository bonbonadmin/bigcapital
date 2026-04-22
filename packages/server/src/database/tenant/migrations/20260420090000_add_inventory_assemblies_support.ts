exports.up = function (knex) {
  return knex.schema
    .table('items', (table) => {
      table.string('unit_of_measure').nullable();
    })
    .createTable('item_assembly_components', (table) => {
      table.increments('id');
      table
        .integer('item_id')
        .unsigned()
        .notNullable()
        .index()
        .references('id')
        .inTable('items')
        .onDelete('CASCADE');
      table
        .integer('component_item_id')
        .unsigned()
        .notNullable()
        .index()
        .references('id')
        .inTable('items');
      table.decimal('quantity', 13, 3).notNullable();
      table.integer('index').unsigned().notNullable().defaultTo(0);
      table.timestamps();
      table.unique(['item_id', 'component_item_id']);
    })
    .createTable('inventory_assemblies', (table) => {
      table.increments('id');
      table
        .integer('item_id')
        .unsigned()
        .notNullable()
        .index()
        .references('id')
        .inTable('items');
      table.decimal('quantity', 13, 3).notNullable();
      table.date('date').notNullable().index();
      table
        .integer('warehouse_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('warehouses');
      table
        .integer('branch_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('branches');
      table.text('note').nullable();
      table.integer('user_id').unsigned().nullable();
      table.timestamps();
    })
    .createTable('inventory_assembly_entries', (table) => {
      table.increments('id');
      table
        .integer('inventory_assembly_id')
        .unsigned()
        .notNullable()
        .index()
        .references('id')
        .inTable('inventory_assemblies')
        .onDelete('CASCADE');
      table
        .integer('component_item_id')
        .unsigned()
        .notNullable()
        .index()
        .references('id')
        .inTable('items');
      table.decimal('quantity', 13, 3).notNullable();
      table.decimal('unit_cost', 13, 3).notNullable().defaultTo(0);
      table.decimal('total_cost', 13, 3).notNullable().defaultTo(0);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('inventory_assembly_entries')
    .dropTableIfExists('inventory_assemblies')
    .dropTableIfExists('item_assembly_components')
    .table('items', (table) => {
      table.dropColumn('unit_of_measure');
    });
};
