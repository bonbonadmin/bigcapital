import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { sumBy } from 'lodash';
import * as moment from 'moment';
import { AccountNormal } from '@/modules/Accounts/Accounts.types';
import { Item } from '@/modules/Items/models/Item';
import { ServiceError } from '@/modules/Items/ServiceError';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CreateInventoryAssemblyDto } from './dtos/InventoryAssembly.dto';
import { InventoryAssembly } from './models/InventoryAssembly';
import { InventoryTransactionsService } from '@/modules/InventoryCost/commands/InventoryTransactions.service';
import { InventoryItemCostService } from '@/modules/InventoryCost/commands/InventoryCosts.service';
import { InventoryAssemblyEntry } from './models/InventoryAssemblyEntry';
import { Ledger } from '@/modules/Ledger/Ledger';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { ERRORS } from './constants';
import { isInventoryAssemblyType } from '@/modules/Items/Items.constants';
import { Warehouse } from '@/modules/Warehouses/models/Warehouse.model';
import { ItemWarehouseQuantity } from '@/modules/Warehouses/models/ItemWarehouseQuantity';

@Injectable()
export class InventoryAssembliesService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly inventoryTransactions: InventoryTransactionsService,
    private readonly inventoryItemCost: InventoryItemCostService,
    private readonly ledgerStorage: LedgerStorageService,
    private readonly tenancyContext: TenancyContext,

    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,

    @Inject(Item.name)
    private readonly itemModel: TenantModelProxy<typeof Item>,

    @Inject(InventoryAssembly.name)
    private readonly inventoryAssemblyModel: TenantModelProxy<
      typeof InventoryAssembly
    >,

    @Inject(InventoryAssemblyEntry.name)
    private readonly inventoryAssemblyEntryModel: TenantModelProxy<
      typeof InventoryAssemblyEntry
    >,

    @Inject(Warehouse.name)
    private readonly warehouseModel: TenantModelProxy<typeof Warehouse>,

    @Inject(ItemWarehouseQuantity.name)
    private readonly itemWarehouseQuantityModel: TenantModelProxy<
      typeof ItemWarehouseQuantity
    >,
  ) {}

  private async allowNegativeAssemblies() {
    const settings = await this.settingsStore();

    return (
      settings.get({
        group: 'items',
        key: 'allow_negative_inventory_assemblies',
      }) ?? false
    );
  }

  private async getAssemblyOrThrow(itemId: number, trx?: Knex.Transaction) {
    const item = await this.itemModel()
      .query(trx)
      .findById(itemId)
      .withGraphFetched('assemblyComponents.componentItem');

    if (!item) {
      throw new ServiceError(ERRORS.ITEM_NOT_FOUND);
    }
    if (!isInventoryAssemblyType(item.type)) {
      throw new ServiceError(ERRORS.ITEM_NOT_ASSEMBLY);
    }
    if (!item.assemblyComponents?.length) {
      throw new ServiceError(ERRORS.ASSEMBLY_COMPONENTS_REQUIRED);
    }
    return item;
  }

  private async validateWarehouse(warehouseId?: number, trx?: Knex.Transaction) {
    if (!warehouseId) return;

    const warehouse = await this.warehouseModel().query(trx).findById(warehouseId);

    if (!warehouse) {
      throw new ServiceError(ERRORS.WAREHOUSE_NOT_FOUND);
    }
  }

  private async getAvailableQuantity(
    itemId: number,
    warehouseId?: number,
    trx?: Knex.Transaction,
  ): Promise<number> {
    if (warehouseId) {
      const quantity = await this.itemWarehouseQuantityModel()
        .query(trx)
        .where({ itemId, warehouseId })
        .first();

      return Number(quantity?.quantityOnHand ?? 0);
    }

    const item = await this.itemModel().query(trx).findById(itemId);
    return Number(item?.quantityOnHand ?? 0);
  }

  private async validateAvailability(
    assemblyItem: Item,
    dto: CreateInventoryAssemblyDto,
    trx?: Knex.Transaction,
  ) {
    const allowNegative = await this.allowNegativeAssemblies();

    if (allowNegative) {
      return;
    }

    const unavailable = [];

    for (const component of assemblyItem.assemblyComponents) {
      const requiredQuantity = Number(component.quantity) * Number(dto.quantity);
      const availableQuantity = await this.getAvailableQuantity(
        component.componentItemId,
        dto.warehouseId,
        trx,
      );

      if (availableQuantity < requiredQuantity) {
        unavailable.push({
          componentItemId: component.componentItemId,
          componentName: component.componentItem?.name,
          availableQuantity,
          requiredQuantity,
        });
      }
    }

    if (unavailable.length > 0) {
      throw new ServiceError(
        ERRORS.ASSEMBLY_COMPONENTS_UNAVAILABLE,
        'Some assembly components do not have enough quantity on hand.',
        { unavailable },
      );
    }
  }

  private async buildLedger(
    assembly: InventoryAssembly,
    assemblyItem: Item,
    componentEntries: Array<{
      componentItem: Item;
      quantity: number;
      totalCost: number;
    }>,
    totalCost: number,
    trx?: Knex.Transaction,
  ) {
    const tenant = await this.tenancyContext.getTenantMetadata();
    const baseEntry = {
      transactionId: assembly.id,
      transactionType: 'InventoryAssembly',
      date: assembly.date,
      currencyCode: tenant.baseCurrency,
      exchangeRate: 1,
      referenceNumber: null,
      userId: assembly.userId,
      branchId: assembly.branchId,
      createdAt: assembly.createdAt,
      accountNormal: AccountNormal.DEBIT,
    };

    const entries = [
      ...componentEntries
        .filter((entry) => entry.totalCost > 0)
        .map((entry, index) => ({
          ...baseEntry,
          credit: entry.totalCost,
          debit: 0,
          accountId: entry.componentItem.inventoryAccountId,
          itemId: entry.componentItem.id,
          index: index + 1,
        })),
      ...(totalCost > 0
        ? [
            {
              ...baseEntry,
              debit: totalCost,
              credit: 0,
              accountId: assemblyItem.inventoryAccountId,
              itemId: assemblyItem.id,
              index: componentEntries.length + 1,
            },
          ]
        : []),
    ];

    if (entries.length > 0) {
      await this.ledgerStorage.commit(new Ledger(entries), trx);
    }
  }

  public async createInventoryAssembly(
    dto: CreateInventoryAssemblyDto,
  ): Promise<InventoryAssembly> {
    if (Number(dto.quantity) <= 0) {
      throw new ServiceError(ERRORS.ASSEMBLY_QUANTITY_INVALID);
    }

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.validateWarehouse(dto.warehouseId, trx);

      const assemblyItem = await this.getAssemblyOrThrow(dto.itemId, trx);
      await this.validateAvailability(assemblyItem, dto, trx);

      const buildDate = dto.date || moment().format('YYYY-MM-DD');
      const componentItemIds = assemblyItem.assemblyComponents.map(
        (component) => component.componentItemId,
      );
      const inventoryValuationMap =
        await this.inventoryItemCost.getItemsInventoryValuation(
          componentItemIds,
          new Date(buildDate),
        );
      const authorizedUser = await this.tenancyContext.getSystemUser();

      const componentEntries = assemblyItem.assemblyComponents.map((component) => {
        const inventoryMeta = inventoryValuationMap.get(component.componentItemId);
        const unitCost = Number(inventoryMeta?.average ?? 0);
        const quantity = Number(component.quantity) * Number(dto.quantity);
        const totalCost = quantity * unitCost;

        return {
          componentItemId: component.componentItemId,
          componentItem: component.componentItem,
          quantity,
          unitCost,
          totalCost,
        };
      });

      const totalCost = sumBy(componentEntries, 'totalCost');
      const assemblyUnitCost =
        Number(dto.quantity) > 0 ? totalCost / Number(dto.quantity) : 0;

      const assembly = await this.inventoryAssemblyModel()
        .query(trx)
        .insertAndFetch({
          itemId: dto.itemId,
          quantity: dto.quantity,
          date: buildDate,
          warehouseId: dto.warehouseId,
          branchId: dto.branchId,
          note: dto.note,
          userId: authorizedUser?.id,
        });

      for (const entry of componentEntries) {
        await this.inventoryAssemblyEntryModel()
          .query(trx)
          .insert({
            inventoryAssemblyId: assembly.id,
            componentItemId: entry.componentItemId,
            quantity: entry.quantity,
            unitCost: entry.unitCost,
            totalCost: entry.totalCost,
          });
      }

      await this.inventoryTransactions.recordInventoryTransactions(
        [
          ...componentEntries.map((entry) => ({
            transactionId: assembly.id,
            transactionType: 'InventoryAssembly',
            date: buildDate,
            createdAt: assembly.createdAt,
            direction: 'OUT' as const,
            itemId: entry.componentItemId,
            quantity: entry.quantity,
            rate: entry.unitCost,
            costAccountId: entry.componentItem.costAccountId,
            warehouseId: dto.warehouseId,
            branchId: dto.branchId,
          })),
          {
            transactionId: assembly.id,
            transactionType: 'InventoryAssembly',
            date: buildDate,
            createdAt: assembly.createdAt,
            direction: 'IN' as const,
            itemId: assemblyItem.id,
            quantity: dto.quantity,
            rate: assemblyUnitCost,
            costAccountId: assemblyItem.costAccountId,
            warehouseId: dto.warehouseId,
            branchId: dto.branchId,
          },
        ],
        false,
        trx,
      );

      await this.buildLedger(
        assembly,
        assemblyItem,
        componentEntries,
        totalCost,
        trx,
      );

      return assembly;
    });
  }
}
