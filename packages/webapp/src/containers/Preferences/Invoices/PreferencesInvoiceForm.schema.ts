// @ts-nocheck
import * as Yup from 'yup';

const Schema = Yup.object().shape({
  termsConditions: Yup.string().optional(),
  customerNotes: Yup.string().optional(),
  erpSalesTypesPerCustomer: Yup.string().optional(),
  preferredReceivableAccount: Yup.number().nullable(),
});

export const PreferencesInvoiceFormSchema = Schema;
