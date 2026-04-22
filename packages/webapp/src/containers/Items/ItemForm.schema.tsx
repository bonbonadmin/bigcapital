// @ts-nocheck
import * as Yup from 'yup';
import { defaultTo } from 'lodash';
import intl from 'react-intl-universal';
import { DATATYPES_LENGTH } from '@/constants/dataTypes';

const Schema = Yup.object().shape({
  active: Yup.boolean(),
  name: Yup.string()
    .required()
    .min(0)
    .max(DATATYPES_LENGTH.STRING)
    .label(intl.get('item_name_')),
  type: Yup.string()
    .trim()
    .required()
    .min(0)
    .max(DATATYPES_LENGTH.STRING)
    .label(intl.get('item_type_')),
  code: Yup.string().trim().min(0).max(DATATYPES_LENGTH.STRING),
  cost_price: Yup.number()
    .min(0)
    .max(DATATYPES_LENGTH.DECIMAL_13_3)
    .when(['purchasable'], {
      is: true,
      then: Yup.number()
        .required()
        .label(intl.get('cost_price_')),
      otherwise: Yup.number().nullable(true),
    }),
  sell_price: Yup.number()
    .min(0)
    .max(DATATYPES_LENGTH.DECIMAL_13_3)
    .when(['sellable'], {
      is: true,
      then: Yup.number()
        .required()
        .label(intl.get('sell_price_')),
      otherwise: Yup.number().nullable(true),
    }),
  cost_account_id: Yup.number()
    .when(['purchasable', 'type'], {
      is: (purchasable, type) =>
        purchasable === true || type === 'inventory-assembly',
      then: Yup.number().required(),
      otherwise: Yup.number().nullable(true),
    })
    .label(intl.get('cost_account_id')),
  sell_account_id: Yup.number()
    .when(['sellable'], {
      is: true,
      then: Yup.number().required(),
      otherwise: Yup.number().nullable(),
    })
    .label(intl.get('sell_account_id')),
  inventory_account_id: Yup.number()
    .when(['type'], {
      is: (value) => ['inventory', 'inventory-assembly'].includes(value),
      then: Yup.number().required(),
      otherwise: Yup.number().nullable(),
    })
    .label(intl.get('inventory_account')),
  unit_of_measure: Yup.string().when(['type'], {
    is: (value) => ['inventory', 'inventory-assembly'].includes(value),
    then: Yup.string().required().label(intl.get('unit_of_measure')),
    otherwise: Yup.string().nullable(),
  }),
  assembly_components: Yup.array().when(['type'], {
    is: (value) => value === 'inventory-assembly',
    then: Yup.array()
      .of(
        Yup.object().shape({
          item_id: Yup.number().required(),
          quantity: Yup.number().min(0.001).required(),
        }),
      )
      .label(intl.get('assembly_components')),
    otherwise: Yup.array().nullable(),
  }),
  category_id: Yup.number().positive().nullable(),
  stock: Yup.string() || Yup.boolean(),
  sellable: Yup.boolean().required(),
  purchasable: Yup.boolean().required(),
});

export const transformItemFormData = (item, defaultValue) => {
  return {
    ...item,
    sellable: !!defaultTo(item?.sellable, defaultValue.sellable),
    purchasable: !!defaultTo(item?.purchasable, defaultValue.purchasable),
    active: !!defaultTo(item?.active, defaultValue.active),
    assembly_components:
      item?.assembly_components || defaultValue.assembly_components,
  };
};

export const CreateItemFormSchema = Schema;
export const EditItemFormSchema = Schema;
