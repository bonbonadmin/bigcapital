import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class InventoryAssemblyEntry extends TenantBaseModel {
  public inventoryAssemblyId!: number;
  public componentItemId!: number;
  public quantity!: number;
  public unitCost!: number;
  public totalCost!: number;

  static get tableName() {
    return 'inventory_assembly_entries';
  }

  get timestamps() {
    return [];
  }

  static get relationMappings() {
    const { InventoryAssembly } = require('./InventoryAssembly');
    const { Item } = require('../../Items/models/Item');

    return {
      inventoryAssembly: {
        relation: Model.BelongsToOneRelation,
        modelClass: InventoryAssembly,
        join: {
          from: 'inventory_assembly_entries.inventoryAssemblyId',
          to: 'inventory_assemblies.id',
        },
      },
      componentItem: {
        relation: Model.BelongsToOneRelation,
        modelClass: Item,
        join: {
          from: 'inventory_assembly_entries.componentItemId',
          to: 'items.id',
        },
      },
    };
  }
}
