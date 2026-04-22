import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class InventoryAssembly extends TenantBaseModel {
  public itemId!: number;
  public quantity!: number;
  public date!: Date | string;
  public warehouseId?: number | null;
  public branchId?: number | null;
  public note?: string | null;
  public userId?: number | null;
  public createdAt?: Date | string;
  public updatedAt?: Date | string;

  static get tableName() {
    return 'inventory_assemblies';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const { Item } = require('../../Items/models/Item');
    const { InventoryAssemblyEntry } = require('./InventoryAssemblyEntry');

    return {
      item: {
        relation: Model.BelongsToOneRelation,
        modelClass: Item,
        join: {
          from: 'inventory_assemblies.itemId',
          to: 'items.id',
        },
      },
      entries: {
        relation: Model.HasManyRelation,
        modelClass: InventoryAssemblyEntry,
        join: {
          from: 'inventory_assemblies.id',
          to: 'inventory_assembly_entries.inventoryAssemblyId',
        },
      },
    };
  }
}
