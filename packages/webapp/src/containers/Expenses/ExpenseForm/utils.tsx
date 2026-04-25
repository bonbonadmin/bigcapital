// @ts-nocheck
import React from 'react';
import * as R from 'ramda';
import intl from 'react-intl-universal';
import moment from 'moment';
import { AppToaster } from '@/components';
import { Intent } from '@blueprintjs/core';
import { useFormikContext } from 'formik';
import { first, sumBy } from 'lodash';
import { useExpenseFormContext } from './ExpenseFormPageProvider';

import {
  defaultFastFieldShouldUpdate,
  transformToForm,
  repeatValue,
  ensureEntriesHasEmptyLine,
  orderingLinesIndexes,
  formattedAmount,
} from '@/utils';
import { useCurrentOrganization } from '@/hooks/state';
import {
  transformAttachmentsToForm,
  transformAttachmentsToRequest,
} from '@/containers/Attachments/utils';

const ERROR = {
  EXPENSE_ALREADY_PUBLISHED: 'EXPENSE.ALREADY.PUBLISHED',
  ENTRIES_ALLOCATED_COST_COULD_NOT_DELETED:
    'ENTRIES_ALLOCATED_COST_COULD_NOT_DELETED',
};

export const MIN_LINES_NUMBER = 1;

export const defaultExpenseEntry = {
  amount: '',
  expense_account_id: '',
  description: '',
  landed_cost: 0,
  project_id: '',
};

export const defaultExpense = {
  expense_mode: 'paid',
  payment_account_id: '',
  payable_account_id: '',
  sales_tax_rate_id: '',
  withholding_tax_id: '',
  internal_notes: '',
  payee_id: '',
  payment_date: moment(new Date()).format('YYYY-MM-DD'),
  description: '',
  reference_no: '',
  currency_code: '',
  publish: '',
  branch_id: '',
  exchange_rate: 1,
  categories: [...repeatValue(defaultExpenseEntry, MIN_LINES_NUMBER)],
  attachments: [],
};

export const transformBillReviewToInitialValues = (
  billImageReview,
  defaultExpense,
  expenseMode,
  baseCurrency,
) => {
  const extracted = billImageReview?.billData?.extracted || {};
  const suggestions = billImageReview?.billData?.suggestions || {};
  const totalAmount =
    extracted.totalAmount ?? extracted.subtotalAmount ?? defaultExpense.categories[0].amount;
  const expenseMemo = extracted.expenseMemo || '';
  const referenceNo = extracted.billNumber || extracted.invoiceNumber || '';

  return {
    ...defaultExpense,
    expense_mode: expenseMode,
    payment_account_id:
      expenseMode === 'paid' ? billImageReview?.bankAccountId || '' : '',
    payable_account_id:
      expenseMode === 'payable' ? billImageReview?.apId || '' : '',
    payee_id: suggestions?.vendor?.contactId || '',
    internal_notes: extracted.notes || '',
    payment_date:
      extracted.documentDate || moment(new Date()).format('YYYY-MM-DD'),
    description: '',
    reference_no: referenceNo,
    currency_code: extracted.currencyCode || baseCurrency || '',
    categories: [
      {
        ...defaultExpense.categories[0],
        amount: totalAmount || '',
        expense_account_id: suggestions?.expenseAccount?.accountId || '',
        description: expenseMemo,
      },
    ],
  };
};

/**
 * Transform API errors in toasts messages.
 */
export const transformErrors = (errors, { setErrors }) => {
  const hasError = (errorType) => errors.some((e) => e.type === errorType);

  if (hasError(ERROR.EXPENSE_ALREADY_PUBLISHED)) {
    setErrors(
      AppToaster.show({
        message: intl.get('the_expense_is_already_published'),
      }),
    );
  }
  if (hasError(ERROR.ENTRIES_ALLOCATED_COST_COULD_NOT_DELETED)) {
    setErrors(
      AppToaster.show({
        intent: Intent.DANGER,
        message: 'ENTRIES_ALLOCATED_COST_COULD_NOT_DELETED',
      }),
    );
  }
};

/**
 * Transformes the expense to form initial values in edit mode.
 */
export const transformToEditForm = (
  expense,
  defaultExpense,
  linesNumber = 4,
) => {
  const expenseEntry = defaultExpense.categories[0];
  const initialEntries = [
    ...expense.categories.map((category) => ({
      ...transformToForm(category, expenseEntry),
    })),
    ...repeatValue(
      expenseEntry,
      Math.max(linesNumber - expense.categories.length, 0),
    ),
  ];
  const categories = R.compose(
    ensureEntriesHasEmptyLine(MIN_LINES_NUMBER, expenseEntry),
  )(initialEntries);

  const attachments = transformAttachmentsToForm(expense);

  return {
    ...transformToForm(expense, defaultExpense),
    categories,
    attachments,
  };
};

/**
 * Detarmine vendors fast-field should update.
 */
export const vendorsFieldShouldUpdate = (newProps, oldProps) => {
  return (
    newProps.shouldUpdateDeps.items !== oldProps.shouldUpdateDeps.items ||
    defaultFastFieldShouldUpdate(newProps, oldProps)
  );
};

/**
 * Detarmine accounts fast-field should update.
 */
export const accountsFieldShouldUpdate = (newProps, oldProps) => {
  return (
    newProps.items !== oldProps.items ||
    defaultFastFieldShouldUpdate(newProps, oldProps)
  );
};

/**
 * Filter expense entries that has no amount or expense account.
 */
export const filterNonZeroEntries = (categories) => {
  return categories.filter(
    (category) => category.amount && category.expense_account_id,
  );
};

/**
 * Transformes the form values to request body.
 */
export const transformFormValuesToRequest = (values) => {
  const categories = filterNonZeroEntries(values.categories);
  const attachments = transformAttachmentsToRequest(values);
  const isPayableExpense = values.expense_mode === 'payable';

  return {
    ...R.omit(['expense_mode', 'internal_notes'], values),
    payment_account_id: isPayableExpense ? null : values.payment_account_id,
    payable_account_id: isPayableExpense ? values.payable_account_id : null,
    sales_tax_rate_id: values.sales_tax_rate_id || null,
    withholding_tax_id: values.withholding_tax_id || null,
    payee_id: values.payee_id || null,
    categories: R.compose(orderingLinesIndexes)(categories),
    attachments,
  };
};

export const useSetPrimaryBranchToForm = () => {
  const { setFieldValue } = useFormikContext();
  const { branches, isBranchesSuccess, isNewMode } = useExpenseFormContext();

  React.useEffect(() => {
    if (isBranchesSuccess && isNewMode) {
      const primaryBranch = branches.find((b) => b.primary) || first(branches);

      if (primaryBranch) {
        setFieldValue('branch_id', primaryBranch.id);
      }
    }
  }, [isBranchesSuccess, setFieldValue, branches, isNewMode]);
};

/**
 * Retrieves the expense subtotal.
 * @returns {number}
 */
export const useExpenseSubtotal = () => {
  const {
    values: { categories },
  } = useFormikContext();

  // Calculates the expense entries amount.
  return React.useMemo(
    () => sumBy(categories, (category) => Number(category.amount) || 0),
    [categories],
  );
};

/**
 * Retrieves the expense subtotal formatted.
 * @returns {string}
 */
export const useExpenseSubtotalFormatted = () => {
  const subtotal = useExpenseSubtotal();
  const {
    values: { currency_code },
  } = useFormikContext();

  return formattedAmount(subtotal, currency_code);
};

/**
 * Retrieves the expense total.
 * @returns {number}
 */
export const useExpenseTotal = () => {
  const subtotal = useExpenseSubtotal();
  const salesTaxAmount = useExpenseSalesTaxAmount();

  return subtotal + salesTaxAmount;
};

export const useExpenseSalesTaxAmount = () => {
  const subtotal = useExpenseSubtotal();
  const { values } = useFormikContext();
  const { taxRates } = useExpenseFormContext();

  return React.useMemo(() => {
    if (!values.sales_tax_rate_id) {
      return 0;
    }
    const salesTaxRate = taxRates.find(
      (taxRate) => String(taxRate.id) === String(values.sales_tax_rate_id),
    );

    if (!salesTaxRate) {
      return 0;
    }
    return (subtotal * (Number(salesTaxRate.rate) || 0)) / 100;
  }, [subtotal, values.sales_tax_rate_id, taxRates]);
};

export const useExpenseSalesTaxAmountFormatted = () => {
  const salesTaxAmount = useExpenseSalesTaxAmount();
  const {
    values: { currency_code },
  } = useFormikContext();

  return formattedAmount(salesTaxAmount, currency_code);
};

export const useExpenseWithholdingTaxAmount = () => {
  const subtotal = useExpenseSubtotal();
  const { values } = useFormikContext();
  const { withholdingTaxes } = useExpenseFormContext();

  return React.useMemo(() => {
    if (!values.withholding_tax_id) {
      return 0;
    }
    const withholdingTax = withholdingTaxes.find(
      (tax) => String(tax.id) === String(values.withholding_tax_id),
    );

    if (!withholdingTax) {
      return 0;
    }
    return (subtotal * (Number(withholdingTax.rate) || 0)) / 100;
  }, [
    subtotal,
    values.withholding_tax_id,
    withholdingTaxes,
  ]);
};

export const useExpenseWithholdingTaxAmountFormatted = () => {
  const withholdingTaxAmount = useExpenseWithholdingTaxAmount();
  const {
    values: { currency_code },
  } = useFormikContext();

  return formattedAmount(withholdingTaxAmount, currency_code);
};

/**
 * Retrieves the expense total formatted.
 * @returns {string}
 */
export const useExpenseTotalFormatted = () => {
  const total = useExpenseTotal();
  const {
    values: { currency_code },
  } = useFormikContext();

  return formattedAmount(total, currency_code);
};

/**
 * Detarmines whether the expenses has foreign .
 * @returns {boolean}
 */
export const useExpensesIsForeign = () => {
  const { values } = useFormikContext();
  const currentOrganization = useCurrentOrganization();

  const isForeignExpenses = React.useMemo(
    () => values.currency_code !== currentOrganization.base_currency,
    [values.currency_code, currentOrganization.base_currency],
  );
  return isForeignExpenses;
};
