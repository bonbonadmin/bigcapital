import axios from 'axios';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { ServiceError } from '@/modules/Items/ServiceError';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { SaleInvoice } from './models/SaleInvoice';
import { Customer } from '@/modules/Customers/models/Customer';
import { Warehouse } from '@/modules/Warehouses/models/Warehouse.model';
import { Item } from '@/modules/Items/models/Item';
import { CreateSaleInvoice } from './commands/CreateSaleInvoice.service';
import { EditSaleInvoice } from './commands/EditSaleInvoice.service';
import { CreateCustomer } from '@/modules/Customers/commands/CreateCustomer.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { CreateSaleInvoiceDto, EditSaleInvoiceDto } from './dtos/SaleInvoice.dto';
import {
  ImportMatchaPopSaleInvoicesDto,
  MatchaPopSaleInvoiceSyncMode,
  SyncMatchaPopSaleInvoicesDto,
} from './dtos/MatchaPopOrders.dto';

type MatchaPopOrderItem = {
  qty?: string | number | null;
  quantity?: string | number | null;
  price?: string | number | null;
  ItemId?: number | null;
  external_item_id?: number | null;
  item_name?: string | null;
  Item?: {
    id?: number | null;
    sku?: string | null;
    name?: string | null;
  } | null;
};

type MatchaPopOrder = {
  id: number;
  customer_id?: number | null;
  CustomerId?: number | null;
  warehouse_external_id?: number | null;
  ShipFromLocationId?: number | null;
  sales_type?: string | null;
  order_status?: string | null;
  OrderStatus?: string | null;
  updated_at?: string | null;
  order_date?: string | null;
  discount?: string | number | null;
  delivery_fee?: string | number | null;
  memo?: string | null;
  invoice_no?: string | null;
  external_id?: string | null;
  ShipStatus?: string | null;
  OrderLine?: {
    items?: MatchaPopOrderItem[] | null;
    grand_total?: string | number | null;
    is_cancelled?: boolean | null;
  } | null;
  lines?: MatchaPopOrderItem[] | null;
  grand_total?: string | number | null;
  Customer?: {
    fullName?: string | null;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
  } | null;
  customer?: {
    full_name?: string | null;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
  } | null;
};

type NormalizedOrder = {
  orderId: number;
  customerExternalId: number | null;
  warehouseExternalId: number | null;
  salesType: string;
  invoiceDate: string;
  invoiceNo: string;
  referenceNo: string;
  discount: number;
  deliveryFee: number;
  memo: string;
  customerDisplayName: string;
  total: number;
  updatedAt: string;
  shouldZeroOut: boolean;
  entries: Array<{
    externalItemId: number;
    itemName: string;
    quantity: number;
    rate: number;
  }>;
};

type FetchOrdersResult = {
  orders: MatchaPopOrder[];
  nextSyncAt: string | null;
  lastSyncAtUsed: string | null;
};

type ResolvedOrderPayload = {
  dto: CreateSaleInvoiceDto | EditSaleInvoiceDto;
  externalId: number;
  orderId: number;
  salesType: string;
  customerLabel: string;
  total: number;
  itemCount: number;
  shouldZeroOut: boolean;
};

@Injectable()
export class SaleInvoicesMatchaPopSyncService {
  private static readonly MATCHA_POP_ORDERS_URL =
    'https://api.matchapop.id/orders/import-invoices';
  private static readonly SHIPPING_ITEM_ID = 1022;
  private static readonly ERP_LAST_SYNC_AT_KEY = 'erp_last_sync_at';

  constructor(
    private readonly createSaleInvoiceService: CreateSaleInvoice,
    private readonly editSaleInvoiceService: EditSaleInvoice,
    private readonly createCustomerService: CreateCustomer,
    private readonly tenancyContext: TenancyContext,

    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,

    @Inject(SaleInvoice.name)
    private readonly saleInvoiceModel: TenantModelProxy<typeof SaleInvoice>,

    @Inject(Customer.name)
    private readonly customerModel: TenantModelProxy<typeof Customer>,

    @Inject(Warehouse.name)
    private readonly warehouseModel: TenantModelProxy<typeof Warehouse>,

    @Inject(Item.name)
    private readonly itemModel: TenantModelProxy<typeof Item>,
  ) {}

  private normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeNumber(value: unknown): number {
    const normalized = Number(value ?? 0);
    return Number.isFinite(normalized) ? normalized : 0;
  }

  private normalizeSalesType(value: unknown): string {
    return this.normalizeText(value).toLowerCase();
  }

  private shouldZeroOutOrder(order: MatchaPopOrder): boolean {
    const orderStatus = this.normalizeSalesType(
      order.order_status ?? order.OrderStatus,
    );
    return orderStatus === 'canceled' || orderStatus === 'payment_expired';
  }

  private async getLastSyncAt(): Promise<string | null> {
    const settings = await this.settingsStore();
    const value = this.normalizeText(
      settings.get(
        {
          group: 'sales_invoices',
          key: SaleInvoicesMatchaPopSyncService.ERP_LAST_SYNC_AT_KEY,
        },
        '',
      ),
    );
    return value || null;
  }

  private async saveLastSyncAt(nextSyncAt?: string | null) {
    const normalized = this.normalizeText(nextSyncAt);

    if (!normalized) return;

    const settings = await this.settingsStore();
    settings.set({
      group: 'sales_invoices',
      key: SaleInvoicesMatchaPopSyncService.ERP_LAST_SYNC_AT_KEY,
      value: normalized,
    });
    await settings.save();
  }

  private async getImportedExternalIds(): Promise<number[]> {
    const invoices = await this.saleInvoiceModel()
      .query()
      .whereNotNull('externalId')
      .select('externalId');

    return Array.from(
      new Set(
        invoices
          .map((invoice) => Number(invoice.externalId))
          .filter((externalId) => Number.isFinite(externalId) && externalId > 0),
      ),
    );
  }

  private async fetchOrders(
    mode: MatchaPopSaleInvoiceSyncMode = 'new',
  ): Promise<FetchOrdersResult> {
    const orders: MatchaPopOrder[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;
    const perPage = 100;
    const lastSyncAt = mode === 'new' ? await this.getLastSyncAt() : null;
    const excludeOrderIds =
      mode === 'new_full' ? await this.getImportedExternalIds() : [];
    let nextSyncAt: string | null = lastSyncAt;

    try {
      while (orders.length < total) {
        const response = await axios.get(
          SaleInvoicesMatchaPopSyncService.MATCHA_POP_ORDERS_URL,
          {
            params: {
              per_page: perPage,
              page,
              ...(mode === 'new' && lastSyncAt
                ? { last_sync_at: lastSyncAt }
                : {}),
              ...(mode === 'new_full'
                ? {
                    full_sync: true,
                    ...(excludeOrderIds.length > 0
                      ? {
                          exclude_order_ids: excludeOrderIds.join(','),
                        }
                      : {}),
                  }
                : {}),
              ...(mode === 'all' ? { full_sync: true } : {}),
            },
            timeout: 20000,
          },
        );

        const payload = response.data?.Orders || {};
        const rows = Array.isArray(payload.rows) ? payload.rows : [];
        total = Number(payload.count ?? rows.length);
        nextSyncAt =
          this.normalizeText(response.data?.sync_meta?.next_sync_at) || nextSyncAt;

        if (rows.length === 0) {
          break;
        }

        orders.push(...rows);
        page += 1;
      }

      return {
        orders,
        nextSyncAt,
        lastSyncAtUsed: lastSyncAt,
      };
    } catch (error) {
      throw new ServiceError(
        'MATCHAPOP_ORDERS_FETCH_FAILED',
        'Failed to fetch orders from MatchaPop.',
        { cause: error?.message },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private normalizeOrder(order: MatchaPopOrder): NormalizedOrder | null {
    const orderId = Number(order.id);
    const invoiceDate = this.normalizeText(order.order_date);
    const shouldZeroOut = this.shouldZeroOutOrder(order);
    const rawEntries = Array.isArray(order.lines)
      ? order.lines
      : Array.isArray(order.OrderLine?.items)
        ? order.OrderLine.items
        : [];

    const entries = rawEntries.length
      ? rawEntries
          .map((entry) => {
            const externalItemId = Number(
              entry.external_item_id ?? entry.ItemId ?? entry.Item?.id,
            );
            const quantity = this.normalizeNumber(entry.qty ?? entry.quantity);
            return {
              externalItemId,
              itemName: this.normalizeText(entry.item_name ?? entry.Item?.name),
              quantity,
              rate: this.normalizeNumber(entry.price),
            };
          })
          .filter(
            (entry) =>
              Number.isFinite(entry.externalItemId) &&
              entry.externalItemId > 0 &&
              entry.quantity > 0,
          )
      : [];

    if (!Number.isFinite(orderId) || orderId <= 0 || !invoiceDate || !entries.length) {
      return null;
    }

    const customerName =
      this.normalizeText(order.customer?.company_name) ||
      [
        this.normalizeText(order.customer?.first_name ?? order.Customer?.firstName),
        this.normalizeText(
          order.customer?.middle_name ?? order.Customer?.middleName,
        ),
        this.normalizeText(order.customer?.last_name ?? order.Customer?.lastName),
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      this.normalizeText(order.customer?.full_name ?? order.Customer?.fullName);

    return {
      orderId,
      customerExternalId: Number.isFinite(
        Number(order.customer_id ?? order.CustomerId),
      )
        ? Number(order.customer_id ?? order.CustomerId)
        : null,
      warehouseExternalId: Number.isFinite(
        Number(order.warehouse_external_id ?? order.ShipFromLocationId),
      )
        ? Number(order.warehouse_external_id ?? order.ShipFromLocationId)
        : null,
      salesType: this.normalizeSalesType(order.sales_type) || 'unknown',
      invoiceDate,
      invoiceNo: `${orderId}`,
      referenceNo: this.normalizeText(order.invoice_no),
      discount: this.normalizeNumber(order.discount),
      deliveryFee: this.normalizeNumber(order.delivery_fee),
      memo: this.normalizeText(order.memo),
      customerDisplayName:
        customerName ||
        `Customer ${order.customer_id ?? order.CustomerId ?? ''}`.trim(),
      total: shouldZeroOut
        ? 0
        : this.normalizeNumber(order.grand_total ?? order.OrderLine?.grand_total),
      updatedAt: this.normalizeText(order.updated_at),
      shouldZeroOut,
      entries,
    };
  }

  private async getPerCustomerSalesTypes(): Promise<Set<string>> {
    const settings = await this.settingsStore();
    const rawValue = this.normalizeText(
      settings.get(
        {
          group: 'sales_invoices',
          key: 'erp_sales_types_per_customer',
        },
        '',
      ),
    );

    return new Set(
      rawValue
        .split(/[\n,]/)
        .map((value) => this.normalizeSalesType(value))
        .filter(Boolean),
    );
  }

  private shouldImportPerCustomer(
    salesType: string,
    perCustomerSalesTypes: Set<string>,
  ) {
    return perCustomerSalesTypes.has(this.normalizeSalesType(salesType));
  }

  private async getBaseCurrencyCode() {
    const tenant = await this.tenancyContext.getTenant(true);
    return tenant?.metadata?.baseCurrency || 'USD';
  }

  private buildAggregateCustomerName(salesType: string) {
    const normalized = this.normalizeSalesType(salesType) || 'unknown';
    return `Agg-${normalized}`;
  }

  private async findOrCreateAggregateCustomer(salesType: string): Promise<Customer> {
    const displayName = this.buildAggregateCustomerName(salesType);
    const existingCustomer = await this.customerModel()
      .query()
      .findOne({ displayName });

    if (existingCustomer) {
      return existingCustomer;
    }

    const currencyCode = await this.getBaseCurrencyCode();

    return this.createCustomerService.createCustomer({
      customerType: 'business',
      currencyCode,
      companyName: displayName,
      displayName,
      active: true,
    });
  }

  private async resolveOrders(
    orders: NormalizedOrder[],
    options?: {
      createAggregateCustomers?: boolean;
      filterOrderIds?: Set<number>;
    },
  ) {
    const perCustomerSalesTypes = await this.getPerCustomerSalesTypes();
    const filteredOrders = options?.filterOrderIds
      ? orders.filter((order) => options.filterOrderIds?.has(order.orderId))
      : orders;

    const customerExternalIds = filteredOrders
      .map((order) => order.customerExternalId)
      .filter((value): value is number => Number.isFinite(value as number));
    const warehouseExternalIds = filteredOrders
      .map((order) => order.warehouseExternalId)
      .filter((value): value is number => Number.isFinite(value as number));
    const itemExternalIds = filteredOrders.flatMap((order) =>
      order.entries.map((entry) => entry.externalItemId),
    );

    const [customers, warehouses, items, shippingItem] = await Promise.all([
      customerExternalIds.length
        ? this.customerModel().query().whereIn('externalId', customerExternalIds)
        : Promise.resolve([]),
      warehouseExternalIds.length
        ? this.warehouseModel().query().whereIn('externalId', warehouseExternalIds)
        : Promise.resolve([]),
      itemExternalIds.length
        ? this.itemModel().query().whereIn('externalId', itemExternalIds)
        : Promise.resolve([]),
      this.itemModel()
        .query()
        .findById(SaleInvoicesMatchaPopSyncService.SHIPPING_ITEM_ID),
    ]);

    const customersByExternalId = new Map<number, Customer>(
      customers.map((customer) => [Number(customer.externalId), customer] as const),
    );
    const warehousesByExternalId = new Map<number, Warehouse>(
      warehouses.map(
        (warehouse) => [Number(warehouse.externalId), warehouse] as const,
      ),
    );
    const itemsByExternalId = new Map<number, Item>(
      items.map((item) => [Number(item.externalId), item] as const),
    );

    const resolvedOrders: ResolvedOrderPayload[] = [];
    const skippedOrders: Array<{
      orderId: number;
      reason: string;
    }> = [];

    for (const order of filteredOrders) {
      const importPerCustomer = this.shouldImportPerCustomer(
        order.salesType,
        perCustomerSalesTypes,
      );

      let customerId: number | undefined;
      let customerLabel = order.customerDisplayName;

      if (importPerCustomer) {
        const customer =
          order.customerExternalId != null
            ? customersByExternalId.get(order.customerExternalId)
            : undefined;

        if (!customer) {
          skippedOrders.push({
            orderId: order.orderId,
            reason: 'Customer external_id mapping was not found.',
          });
          continue;
        }
        customerId = customer.id;
        customerLabel = customer.displayName;
      } else {
        const aggregateCustomer = options?.createAggregateCustomers
          ? await this.findOrCreateAggregateCustomer(order.salesType)
          : await this.customerModel()
              .query()
              .findOne({
                displayName: this.buildAggregateCustomerName(order.salesType),
              });

        if (!aggregateCustomer) {
          skippedOrders.push({
            orderId: order.orderId,
            reason: 'Aggregate ERP customer is missing.',
          });
          continue;
        }
        customerId = aggregateCustomer.id;
        customerLabel = aggregateCustomer.displayName;
      }

      const missingItem = order.entries.find(
        (entry) => !itemsByExternalId.has(entry.externalItemId),
      );
      if (missingItem) {
        skippedOrders.push({
          orderId: order.orderId,
          reason: `Item external_id ${missingItem.externalItemId} was not found.`,
        });
        continue;
      }
      if (order.deliveryFee > 0 && !shippingItem) {
        skippedOrders.push({
          orderId: order.orderId,
          reason: `Shipping item ${SaleInvoicesMatchaPopSyncService.SHIPPING_ITEM_ID} was not found.`,
        });
        continue;
      }

      const dto: CreateSaleInvoiceDto = {
        customerId,
        invoiceDate: order.invoiceDate as any,
        dueDate: order.invoiceDate as any,
        invoiceNo: order.invoiceNo,
        referenceNo: order.referenceNo,
        invoiceMessage: order.memo,
        termsConditions: '',
        isInclusiveTax: false,
        exchangeRate: 1,
        delivered: true,
        warehouseId:
          order.warehouseExternalId != null
            ? warehousesByExternalId.get(order.warehouseExternalId)?.id
            : undefined,
        entries: [
          ...order.entries.map((entry, index) => ({
            index,
            itemId: itemsByExternalId.get(entry.externalItemId)!.id,
            quantity: order.shouldZeroOut ? 0 : entry.quantity,
            rate: entry.rate,
            description: entry.itemName,
          })),
          ...(order.deliveryFee > 0 && shippingItem
            ? [
                {
                  index: order.entries.length,
                  itemId: shippingItem.id,
                  quantity: order.shouldZeroOut ? 0 : 1,
                  rate: order.deliveryFee,
                  description: shippingItem.name || 'Shipping',
                },
              ]
            : []),
        ],
        discount: order.shouldZeroOut ? 0 : order.discount,
        discountType: 'amount' as any,
        adjustment: 0,
      };

      resolvedOrders.push({
        dto,
        externalId: order.orderId,
        orderId: order.orderId,
        salesType: order.salesType,
        customerLabel,
        total: order.total,
        itemCount:
          order.entries.length + (order.deliveryFee > 0 && shippingItem ? 1 : 0),
        shouldZeroOut: order.shouldZeroOut,
      });
    }

    return {
      resolvedOrders,
      skippedOrders,
    };
  }

  private async getExistingInvoicesByExternalId(externalIds: number[]) {
    if (!externalIds.length) {
      return new Map<number, SaleInvoice>();
    }

    const invoices = await this.saleInvoiceModel()
      .query()
      .whereIn('externalId', externalIds)
      .withGraphFetched('paymentEntries');

    return new Map(invoices.map((invoice) => [Number(invoice.externalId), invoice]));
  }

  private async patchExternalId(
    saleInvoiceId: number,
    externalId: number,
    trx?: Knex.Transaction,
  ) {
    await this.saleInvoiceModel()
      .query(trx)
      .patchAndFetchById(saleInvoiceId, { externalId });
  }

  public async syncExistingOrders(dto?: SyncMatchaPopSaleInvoicesDto) {
    const mode = dto?.mode || 'new';
    const { orders: rawOrders, nextSyncAt, lastSyncAtUsed } =
      await this.fetchOrders(mode);
    const normalizedOrders = rawOrders
      .map((order) => this.normalizeOrder(order))
      .filter((order): order is NormalizedOrder => Boolean(order));

    const { resolvedOrders, skippedOrders } = await this.resolveOrders(
      normalizedOrders,
      { createAggregateCustomers: true },
    );

    const existingInvoicesByExternalId = await this.getExistingInvoicesByExternalId(
      resolvedOrders.map((order) => order.externalId),
    );

    let updatedCount = 0;
    const updatedInvoiceIds: number[] = [];
    const importCandidates: Array<{
      order_id: number;
      invoice_no: string;
      order_date: string;
      sales_type: string;
      customer_name: string;
      total: number;
      item_count: number;
    }> = [];

    for (const order of resolvedOrders) {
      const existingInvoice = existingInvoicesByExternalId.get(order.externalId);

      if (!existingInvoice) {
        const invoiceNoConflict = await this.saleInvoiceModel()
          .query()
          .findOne('invoice_no', order.dto.invoiceNo);

        if (invoiceNoConflict) {
          skippedOrders.push({
            orderId: order.orderId,
            reason: `Invoice # ${order.dto.invoiceNo} already exists.`,
          });
          continue;
        }

        importCandidates.push({
          order_id: order.orderId,
          invoice_no: order.dto.invoiceNo,
          order_date: order.dto.invoiceDate as any,
          sales_type: order.salesType,
          customer_name: order.customerLabel,
          total: order.total,
          item_count: order.itemCount,
        });
        continue;
      }

      if (order.shouldZeroOut && existingInvoice.paymentEntries?.length) {
        skippedOrders.push({
          orderId: order.orderId,
          reason:
            'Unable to sync canceled or expired ERP order because payment received transactions already exist for this invoice.',
        });
        continue;
      }

      await this.editSaleInvoiceService.editSaleInvoice(
        existingInvoice.id,
        order.dto as EditSaleInvoiceDto,
      );

      updatedCount += 1;
      updatedInvoiceIds.push(existingInvoice.id);
    }

    return {
      mode,
      lastSyncAt: lastSyncAtUsed,
      nextSyncAt,
      totalExternalOrders: normalizedOrders.length,
      updatedCount,
      updatedInvoiceIds,
      importCandidates,
      skippedOrders,
    };
  }

  public async importOrders(dto: ImportMatchaPopSaleInvoicesDto) {
    const orderIds = Array.isArray(dto.orderIds) ? dto.orderIds.map(Number) : [];
    const mode = dto?.mode || 'new';

    if (!orderIds.length) {
      return {
        createdCount: 0,
        createdIds: [],
        skippedOrders: [],
      };
    }

    const { orders: rawOrders } = await this.fetchOrders(mode);
    const normalizedOrders = rawOrders
      .map((order) => this.normalizeOrder(order))
      .filter((order): order is NormalizedOrder => Boolean(order));

    const { resolvedOrders, skippedOrders } = await this.resolveOrders(
      normalizedOrders,
      {
        createAggregateCustomers: true,
        filterOrderIds: new Set(orderIds),
      },
    );

    const existingInvoicesByExternalId = await this.getExistingInvoicesByExternalId(
      resolvedOrders.map((order) => order.externalId),
    );

    const createdIds: number[] = [];

    for (const order of resolvedOrders) {
      if (existingInvoicesByExternalId.has(order.externalId)) {
        skippedOrders.push({
          orderId: order.orderId,
          reason: 'Invoice already imported from ERP.',
        });
        continue;
      }

      const invoiceNoConflict = await this.saleInvoiceModel()
        .query()
        .findOne('invoice_no', order.dto.invoiceNo);

      if (invoiceNoConflict) {
        skippedOrders.push({
          orderId: order.orderId,
          reason: `Invoice # ${order.dto.invoiceNo} already exists.`,
        });
        continue;
      }

      const createdInvoice = await this.createSaleInvoiceService.createSaleInvoice(
        order.dto,
      );
      await this.patchExternalId(createdInvoice.id, order.externalId);

      createdIds.push(createdInvoice.id);
      existingInvoicesByExternalId.set(order.externalId, createdInvoice);
    }

    await this.saveLastSyncAt(dto.nextSyncAt);

    return {
      mode,
      createdCount: createdIds.length,
      createdIds,
      skippedOrders,
    };
  }
}
