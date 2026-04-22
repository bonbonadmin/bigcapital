import { DATATYPES_LENGTH } from '@/constants/data-types';
import z from 'zod';

export const createItemSchema = z
  .object({
    name: z.string().max(DATATYPES_LENGTH.STRING),
    type: z.enum(['service', 'non-inventory', 'inventory', 'inventory-assembly']),
    code: z.string().max(DATATYPES_LENGTH.STRING).nullable().optional(),
    purchasable: z.boolean().optional(),
    cost_price: z
      .number()
      .min(0)
      .max(DATATYPES_LENGTH.DECIMAL_13_3)
      .nullable()
      .optional(),
    cost_account_id: z
      .number()
      .int()
      .min(0)
      .max(DATATYPES_LENGTH.INT_10)
      .nullable()
      .optional(),
    sellable: z.boolean().optional(),
    sell_price: z
      .number()
      .min(0)
      .max(DATATYPES_LENGTH.DECIMAL_13_3)
      .nullable()
      .optional(),
    sell_account_id: z
      .number()
      .int()
      .min(0)
      .max(DATATYPES_LENGTH.INT_10)
      .nullable()
      .optional(),
    inventory_account_id: z
      .number()
      .int()
      .min(0)
      .max(DATATYPES_LENGTH.INT_10)
      .nullable()
      .optional(),
    sell_description: z
      .string()
      .max(DATATYPES_LENGTH.TEXT)
      .nullable()
      .optional(),
    purchase_description: z
      .string()
      .max(DATATYPES_LENGTH.TEXT)
      .nullable()
      .optional(),
    sell_tax_rate_id: z.number().int().nullable().optional(),
    purchase_tax_rate_id: z.number().int().nullable().optional(),
    category_id: z
      .number()
      .int()
      .min(0)
      .max(DATATYPES_LENGTH.INT_10)
      .nullable()
      .optional(),
    note: z.string().max(DATATYPES_LENGTH.TEXT).optional(),
    active: z.boolean().optional(),
    media_ids: z.array(z.number().int()).optional(),
    unit_of_measure: z.string().max(100).nullable().optional(),
    assembly_components: z
      .array(
        z.object({
          item_id: z.number().int().min(1),
          quantity: z.number().min(0.001).max(DATATYPES_LENGTH.DECIMAL_13_3),
        }),
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.purchasable) {
        return (
          data.cost_price !== undefined && data.cost_account_id !== undefined
        );
      }
      return true;
    },
    {
      message:
        'Cost price and cost account ID are required when item is purchasable',
      path: ['cost_price', 'cost_account_id'],
    },
  )
  .refine(
    (data) => {
      if (data.sellable) {
        return (
          data.sell_price !== undefined && data.sell_account_id !== undefined
        );
      }
      return true;
    },
    {
      message:
        'Sell price and sell account ID are required when item is sellable',
      path: ['sell_price', 'sell_account_id'],
    },
  )
  .refine(
    (data) => {
      if (['inventory', 'inventory-assembly'].includes(data.type)) {
        return data.inventory_account_id !== undefined;
      }
      return true;
    },
    {
      message: 'Inventory account ID is required for inventory items',
      path: ['inventory_account_id'],
    },
  )
  .refine(
    (data) => {
      if (['inventory', 'inventory-assembly'].includes(data.type)) {
        return !!data.unit_of_measure;
      }
      return true;
    },
    {
      message: 'Unit of measure is required for inventory tracked items',
      path: ['unit_of_measure'],
    },
  )
  .refine(
    (data) => {
      if (data.type === 'inventory-assembly') {
        return (
          data.cost_account_id !== undefined &&
          data.inventory_account_id !== undefined
        );
      }
      return true;
    },
    {
      message:
        'Assembly items require a cost account and inventory account',
      path: ['assembly_components'],
    },
  );


export type createItemDTO = z.infer<typeof createItemSchema>;
export type editItemDTOSchema = z.infer<typeof createItemSchema>;
