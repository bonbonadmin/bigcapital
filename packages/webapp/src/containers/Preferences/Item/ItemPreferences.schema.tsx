// @ts-nocheck
import * as Yup from 'yup';

const Schema = Yup.object().shape({
  preferred_sell_account: Yup.number().nullable(),
  preferred_cost_account: Yup.number().nullable(),
  preferred_inventory_account: Yup.number().nullable(),
  allow_negative_inventory_assemblies: Yup.boolean(),
});

export const ItemPreferencesSchema = Schema;
