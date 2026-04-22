import axios from 'axios';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { Item } from './models/Item';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { ServiceError } from './ServiceError';
import { CreateItemService } from './CreateItem.service';
import { ImportMatchaPopItemsDto, ImportMatchaPopItemDto } from './dtos/MatchaPopItems.dto';
import { CreateItemDto } from './dtos/Item.dto';

type MatchaPopProduct = {
  id: number;
  name: string;
  sku?: string | null;
  retail_price?: number | null;
  cost_price?: number | null;
  item_category?: {
    id?: number | null;
    name?: string | null;
  } | null;
};

@Injectable()
export class ItemsMatchaPopSyncService {
  private static readonly MATCHA_POP_PRODUCTS_URL =
    'https://api.matchapop.id/products';

  constructor(
    private readonly createItemService: CreateItemService,

    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,

    @Inject(Item.name)
    private readonly itemModel: TenantModelProxy<typeof Item>,
  ) {}

  private async fetchProducts(): Promise<MatchaPopProduct[]> {
    try {
      const response = await axios.get(
        ItemsMatchaPopSyncService.MATCHA_POP_PRODUCTS_URL,
        {
          timeout: 15000,
        },
      );

      return Array.isArray(response.data?.Products) ? response.data.Products : [];
    } catch (error) {
      throw new ServiceError(
        'MATCHAPOP_PRODUCTS_FETCH_FAILED',
        'Failed to fetch products from MatchaPop.',
        { cause: error?.message },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private normalizeNumber(value: unknown): number {
    const normalized = Number(value ?? 0);
    return Number.isFinite(normalized) ? normalized : 0;
  }

  private async getDefaultAccountsOrThrow() {
    const settings = await this.settingsStore();

    const preferredSellAccount = settings.get({
      group: 'items',
      key: 'preferred_sell_account',
    });
    const preferredCostAccount = settings.get({
      group: 'items',
      key: 'preferred_cost_account',
    });
    const preferredInventoryAccount = settings.get({
      group: 'items',
      key: 'preferred_inventory_account',
    });

    if (!preferredSellAccount || !preferredCostAccount || !preferredInventoryAccount) {
      throw new ServiceError(
        'MATCHAPOP_DEFAULT_ACCOUNTS_REQUIRED',
        'Default item accounts must be configured before importing MatchaPop products.',
      );
    }

    return {
      preferredSellAccount,
      preferredCostAccount,
      preferredInventoryAccount,
    };
  }

  private buildCreateItemDto(
    item: ImportMatchaPopItemDto,
    defaultAccounts: {
      preferredSellAccount: number;
      preferredCostAccount: number;
      preferredInventoryAccount: number;
    },
  ): CreateItemDto {
    const commonPayload = {
      name: item.name,
      type: item.type,
      code: item.code || '',
      externalId: item.externalId,
      categoryId: item.categoryId,
      sellable: true,
      sellPrice: this.normalizeNumber(item.sellPrice),
      sellAccountId: defaultAccounts.preferredSellAccount,
      active: true,
      note:
        item.type === 'inventory-assembly'
          ? 'Reminder: configure assembly components after import.'
          : '',
    };

    if (item.type === 'service') {
      return {
        ...commonPayload,
        purchasable: false,
      };
    }

    if (item.type === 'inventory-assembly') {
      return {
        ...commonPayload,
        purchasable: false,
        costAccountId: defaultAccounts.preferredCostAccount,
        inventoryAccountId: defaultAccounts.preferredInventoryAccount,
        unitOfMeasure: item.unitOfMeasure,
        assemblyComponents: [],
      };
    }

    return {
      ...commonPayload,
      purchasable: true,
      costPrice: this.normalizeNumber(item.costPrice),
      costAccountId: defaultAccounts.preferredCostAccount,
      inventoryAccountId: defaultAccounts.preferredInventoryAccount,
      unitOfMeasure: item.unitOfMeasure,
    };
  }

  public async syncExistingItems() {
    const products = await this.fetchProducts();
    const externalIds = products
      .map((product) => Number(product.id))
      .filter((productId) => Number.isFinite(productId));

    const existingItems = externalIds.length
      ? await this.itemModel().query().whereIn('externalId', externalIds)
      : [];
    const existingItemsMap = new Map(
      existingItems.map((item) => [Number(item.externalId), item]),
    );

    let updatedCount = 0;
    const updatedItemIds: number[] = [];

    for (const product of products) {
      const existingItem = existingItemsMap.get(Number(product.id));

      if (!existingItem) {
        continue;
      }

      const nextCostPrice = this.normalizeNumber(product.cost_price);
      const nextSellPrice = this.normalizeNumber(product.retail_price);
      const currentCostPrice = this.normalizeNumber(existingItem.costPrice);
      const currentSellPrice = this.normalizeNumber(existingItem.sellPrice);

      if (
        currentCostPrice === nextCostPrice &&
        currentSellPrice === nextSellPrice
      ) {
        continue;
      }

      await this.itemModel().query().patchAndFetchById(existingItem.id, {
        costPrice: nextCostPrice,
        sellPrice: nextSellPrice,
      });

      updatedCount += 1;
      updatedItemIds.push(existingItem.id);
    }

    const importCandidates = products
      .filter((product) => !existingItemsMap.has(Number(product.id)))
      .map((product) => ({
        externalId: Number(product.id),
        name: product.name,
        code: product.sku || '',
        costPrice: this.normalizeNumber(product.cost_price),
        sellPrice: this.normalizeNumber(product.retail_price),
        categoryName: product.item_category?.name || null,
      }));

    return {
      totalExternalProducts: products.length,
      updatedCount,
      updatedItemIds,
      importCandidates,
    };
  }

  public async importProducts(dto: ImportMatchaPopItemsDto) {
    const items = Array.isArray(dto.items) ? dto.items : [];

    if (items.length === 0) {
      return {
        createdCount: 0,
        createdIds: [],
        skippedExternalIds: [],
        importedAssemblyCount: 0,
      };
    }

    const defaultAccounts = await this.getDefaultAccountsOrThrow();
    const existingItems = await this.itemModel()
      .query()
      .whereIn(
        'externalId',
        items.map((item) => item.externalId),
      );
    const existingExternalIds = new Set(
      existingItems.map((item) => Number(item.externalId)),
    );

    const createdIds: number[] = [];
    const skippedExternalIds: number[] = [];
    let importedAssemblyCount = 0;

    for (const item of items) {
      if (existingExternalIds.has(Number(item.externalId))) {
        skippedExternalIds.push(Number(item.externalId));
        continue;
      }

      const createItemDto = this.buildCreateItemDto(item, defaultAccounts);
      const createdId = await this.createItemService.createItem(createItemDto);

      createdIds.push(createdId);
      existingExternalIds.add(Number(item.externalId));

      if (item.type === 'inventory-assembly') {
        importedAssemblyCount += 1;
      }
    }

    return {
      createdCount: createdIds.length,
      createdIds,
      skippedExternalIds,
      importedAssemblyCount,
    };
  }
}
