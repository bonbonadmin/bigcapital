import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { uniq } from 'lodash';
import { ServiceError } from './ServiceError';
import { ERRORS } from './Items.constants';
import { Item } from './models/Item';
import { ItemAssemblyComponent } from './models/ItemAssemblyComponent';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { ItemAssemblyComponentDto } from './dtos/Item.dto';
import { isInventoryAssemblyType } from './Items.constants';

@Injectable()
export class ItemAssemblyComponentsService {
  private normalizeComponents(components: ItemAssemblyComponentDto[] = []) {
    return components.map((component: ItemAssemblyComponentDto & {
      item_id?: number;
    }) => ({
      itemId: component.itemId ?? component.item_id,
      quantity: component.quantity,
    }));
  }

  constructor(
    @Inject(Item.name)
    private readonly itemModel: TenantModelProxy<typeof Item>,

    @Inject(ItemAssemblyComponent.name)
    private readonly itemAssemblyComponentModel: TenantModelProxy<
      typeof ItemAssemblyComponent
    >,
  ) {}

  public async validateAssemblyComponents(
    itemId: number | undefined,
    type: string,
    components: ItemAssemblyComponentDto[] = [],
  ) {
    const normalizedComponents = this.normalizeComponents(components);

    if (!isInventoryAssemblyType(type)) {
      return;
    }
    if (normalizedComponents.length <= 0) {
      return;
    }

    const componentIds = normalizedComponents.map((component) => component.itemId);

    if (componentIds.some((componentId) => !componentId)) {
      throw new ServiceError(
        ERRORS.ASSEMBLY_COMPONENT_NOT_FOUND,
        'One or more assembly components could not be found.',
      );
    }
    const uniqueComponentIds = uniq(componentIds);

    if (itemId && uniqueComponentIds.includes(itemId)) {
      throw new ServiceError(
        ERRORS.ASSEMBLY_COMPONENT_SELF_REFERENCE,
        'Assembly item cannot reference itself as a component.',
      );
    }
    if (uniqueComponentIds.length !== componentIds.length) {
      throw new ServiceError(
        ERRORS.ASSEMBLY_COMPONENT_DUPLICATED,
        'Assembly components must be unique.',
      );
    }

    const foundItems = await this.itemModel()
      .query()
      .whereIn('id', uniqueComponentIds);

    if (foundItems.length !== uniqueComponentIds.length) {
      throw new ServiceError(
        ERRORS.ASSEMBLY_COMPONENT_NOT_FOUND,
        'One or more assembly components could not be found.',
      );
    }

    const invalidComponent = foundItems.find((item) => item.type !== 'inventory');

    if (invalidComponent) {
      throw new ServiceError(
        ERRORS.ASSEMBLY_COMPONENT_NOT_INVENTORY,
        'Assembly components must be inventory items.',
      );
    }
  }

  public async syncAssemblyComponents(
    itemId: number,
    type: string,
    components: ItemAssemblyComponentDto[] = [],
    trx?: Knex.Transaction,
  ) {
    const normalizedComponents = this.normalizeComponents(components);

    await this.itemAssemblyComponentModel()
      .query(trx)
      .where('itemId', itemId)
      .delete();

    if (!isInventoryAssemblyType(type) || normalizedComponents.length <= 0) {
      return;
    }

    for (const [index, component] of normalizedComponents.entries()) {
      await this.itemAssemblyComponentModel()
        .query(trx)
        .insert({
          itemId,
          componentItemId: component.itemId,
          quantity: component.quantity,
          index,
        });
    }
  }
}
