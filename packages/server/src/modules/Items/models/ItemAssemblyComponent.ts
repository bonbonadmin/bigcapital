import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';
import { Item } from './Item';

export class ItemAssemblyComponent extends TenantBaseModel {
  public itemId!: number;
  public componentItemId!: number;
  public quantity!: number;
  public index!: number;
  public componentItem?: Item;

  static get tableName() {
    return 'item_assembly_components';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const { Item } = require('./Item');

    return {
      item: {
        relation: Model.BelongsToOneRelation,
        modelClass: Item,
        join: {
          from: 'item_assembly_components.itemId',
          to: 'items.id',
        },
      },
      componentItem: {
        relation: Model.BelongsToOneRelation,
        modelClass: Item,
        join: {
          from: 'item_assembly_components.componentItemId',
          to: 'items.id',
        },
      },
    };
  }
}
