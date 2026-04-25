// @ts-nocheck
import * as Yup from 'yup';
import intl from 'react-intl-universal';
import { DATATYPES_LENGTH } from '@/constants/dataTypes';
import { isBlank } from '@/utils';

const Schema = Yup.object().shape({
  expense_mode: Yup.string().nullable(),
  payee_id: Yup.number()
    .nullable()
    .when('publish', {
      is: true,
      then: Yup.number().required().label(intl.get('vendor_name_')),
    }),
  payment_account_id: Yup.number().nullable().when('expense_mode', {
    is: 'payable',
    otherwise: Yup.number().required().label(intl.get('payment_account_')),
  }),
  payable_account_id: Yup.number().nullable().when('expense_mode', {
    is: 'payable',
    then: Yup.number().required().label(intl.get('payable_account_')),
  }),
  sales_tax_rate_id: Yup.number().nullable(),
  withholding_tax_id: Yup.number().nullable(),
  payment_date: Yup.date().required().label(intl.get('payment_date_')),
  reference_no: Yup.string().min(1).max(DATATYPES_LENGTH.STRING).nullable(),
  currency_code: Yup.string()
    .nullable()
    .max(3)
    .label(intl.get('currency_code')),
  description: Yup.string()
    .trim()
    .min(1)
    .max(DATATYPES_LENGTH.TEXT)
    .nullable()
    .label(intl.get('description')),
  publish: Yup.boolean(),
  categories: Yup.array().of(
    Yup.object().shape({
      index: Yup.number().min(1).max(DATATYPES_LENGTH.INT_10).nullable(),
      amount: Yup.number().nullable(),
      expense_account_id: Yup.number()
        .nullable()
        .when(['amount'], {
          is: (amount) => !isBlank(amount),
          then: Yup.number().required(),
        }),
      landed_cost: Yup.boolean(),
      description: Yup.string().max(DATATYPES_LENGTH.TEXT).nullable(),
      project_id: Yup.number().nullable(),
    }),
  ),
});

export const CreateExpenseFormSchema = Schema;
export const EditExpenseFormSchema = Schema;
