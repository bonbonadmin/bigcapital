import axios from 'axios';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Warehouse } from './models/Warehouse.model';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { CreateWarehouse } from './commands/CreateWarehouse.service';
import {
  ImportMatchaPopWarehouseDto,
  ImportMatchaPopWarehousesDto,
} from './dtos/MatchaPopWarehouses.dto';

type MatchaPopWarehouse = {
  id: number;
  LocationName?: string | null;
  addressLine1?: string | null;
  phone_number?: string | null;
  City?: {
    name?: string | null;
  } | null;
};

@Injectable()
export class WarehousesMatchaPopSyncService {
  private static readonly MATCHA_POP_WAREHOUSES_URL =
    'https://api.matchapop.id/warehouse';

  constructor(
    private readonly createWarehouseService: CreateWarehouse,

    @Inject(Warehouse.name)
    private readonly warehouseModel: TenantModelProxy<typeof Warehouse>,
  ) {}

  private normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeWarehouse(warehouse: MatchaPopWarehouse) {
    const externalId = Number(warehouse.id);
    const name = this.normalizeText(warehouse.LocationName);

    return {
      externalId,
      name,
      code: `${externalId}`,
      address: this.normalizeText(warehouse.addressLine1),
      city: this.normalizeText(warehouse.City?.name),
      country: 'Indonesia',
      phoneNumber: this.normalizeText(warehouse.phone_number),
    };
  }

  private isImportableWarehouse(warehouse: { externalId: number; name: string }) {
    return (
      Number.isFinite(warehouse.externalId) &&
      warehouse.externalId > 0 &&
      Boolean(warehouse.name)
    );
  }

  private async fetchWarehouses(): Promise<MatchaPopWarehouse[]> {
    try {
      const response = await axios.get(
        WarehousesMatchaPopSyncService.MATCHA_POP_WAREHOUSES_URL,
        {
          timeout: 15000,
        },
      );

      return Array.isArray(response.data?.Warehouses)
        ? response.data.Warehouses
        : [];
    } catch (error) {
      throw new ServiceError(
        'MATCHAPOP_WAREHOUSES_FETCH_FAILED',
        'Failed to fetch warehouses from MatchaPop.',
        { cause: error?.message },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  public async syncExistingWarehouses() {
    const warehouses = (await this.fetchWarehouses())
      .map((warehouse) => this.normalizeWarehouse(warehouse))
      .filter((warehouse) => this.isImportableWarehouse(warehouse));

    const externalIds = warehouses.map((warehouse) => warehouse.externalId);
    const existingWarehouses = externalIds.length
      ? await this.warehouseModel().query().whereIn('externalId', externalIds)
      : [];
    const existingWarehousesMap = new Map(
      existingWarehouses.map((warehouse) => [
        Number(warehouse.externalId),
        warehouse,
      ]),
    );

    let updatedCount = 0;
    const updatedWarehouseIds: number[] = [];

    for (const warehouse of warehouses) {
      const existingWarehouse = existingWarehousesMap.get(warehouse.externalId);
      if (!existingWarehouse) continue;

      const patch = {
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address || null,
        city: warehouse.city || null,
        country: warehouse.country || null,
        phoneNumber: warehouse.phoneNumber || null,
      };

      const hasChanges =
        this.normalizeText(existingWarehouse.name) !== patch.name ||
        this.normalizeText(existingWarehouse.code) !== patch.code ||
        this.normalizeText(existingWarehouse.address) !==
          this.normalizeText(patch.address) ||
        this.normalizeText(existingWarehouse.city) !==
          this.normalizeText(patch.city) ||
        this.normalizeText(existingWarehouse.country) !==
          this.normalizeText(patch.country) ||
        this.normalizeText(existingWarehouse.phoneNumber) !==
          this.normalizeText(patch.phoneNumber);

      if (!hasChanges) continue;

      await this.warehouseModel()
        .query()
        .patchAndFetchById(existingWarehouse.id, patch);

      updatedCount += 1;
      updatedWarehouseIds.push(existingWarehouse.id);
    }

    const importCandidates = warehouses.filter(
      (warehouse) => !existingWarehousesMap.has(warehouse.externalId),
    );

    return {
      totalExternalWarehouses: warehouses.length,
      updatedCount,
      updatedWarehouseIds,
      importCandidates,
    };
  }

  public async importWarehouses(dto: ImportMatchaPopWarehousesDto) {
    const warehouses = Array.isArray(dto.warehouses) ? dto.warehouses : [];

    if (warehouses.length === 0) {
      return {
        createdCount: 0,
        createdIds: [],
        skippedExternalIds: [],
      };
    }

    const existingWarehouses = await this.warehouseModel()
      .query()
      .whereIn(
        'externalId',
        warehouses.map((warehouse) => warehouse.externalId),
      );
    const existingExternalIds = new Set(
      existingWarehouses.map((warehouse) => Number(warehouse.externalId)),
    );

    const createdIds: number[] = [];
    const skippedExternalIds: number[] = [];

    for (const warehouse of warehouses) {
      if (existingExternalIds.has(Number(warehouse.externalId))) {
        skippedExternalIds.push(Number(warehouse.externalId));
        continue;
      }

      const createdWarehouse = await this.createWarehouseService.createWarehouse({
        externalId: warehouse.externalId,
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address || '',
        city: warehouse.city || '',
        country: warehouse.country || '',
        phoneNumber: warehouse.phoneNumber || '',
      });

      createdIds.push(createdWarehouse.id);
      existingExternalIds.add(Number(warehouse.externalId));
    }

    return {
      createdCount: createdIds.length,
      createdIds,
      skippedExternalIds,
    };
  }
}
