// @ts-nocheck
import React from 'react';
import moment from 'moment';
import intl from 'react-intl-universal';
import { first, sumBy } from 'lodash';
import { useFormikContext } from 'formik';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '@/components';
import {
  defaultFastFieldShouldUpdate,
  transformToForm,
  orderingLinesIndexes,
  formattedAmount,
} from '@/utils';
import { useCurrentOrganization } from '@/hooks/state';

export const defaultExpensePaymentEntry = {
  expense_id: '',
  payment_amount: '',
  currency_code: '',
  id: null,
  due_amount: null,
  amount: '',
  reference_no: '',
  date: '',
};

export const defaultExpensePayment = {
  vendor_id: '',
  payment_account_id: '',
  payment_date: moment(new Date()).format('YYYY-MM-DD'),
  reference: '',
  payment_number: '',
  statement: '',
  currency_code: '',
  branch_id: '',
  exchange_rate: 1,
  entries: [],
};

export const transformToEditForm = (expensePayment, entries) => {
  return {
    ...transformToForm(expensePayment, defaultExpensePayment),
    entries: entries.map((entry) => ({
      ...transformToForm(entry, defaultExpensePaymentEntry),
      payment_amount: entry.payment_amount || '',
    })),
  };
};

export const transformToNewPageEntries = (entries, defaultExpenseId) => {
  return entries.map((entry) => ({
    ...transformToForm(entry, defaultExpensePaymentEntry),
    payment_amount:
      defaultExpenseId && Number(entry.expense_id) === Number(defaultExpenseId)
        ? entry.due_amount
        : '',
    currency_code: entry.currency_code,
  }));
};

export const vendorsFieldShouldUpdate = (newProps, oldProps) => {
  return (
    newProps.shouldUpdateDeps.items !== oldProps.shouldUpdateDeps.items ||
    defaultFastFieldShouldUpdate(newProps, oldProps)
  );
};

export const accountsFieldShouldUpdate = (newProps, oldProps) => {
  return (
    newProps.items !== oldProps.items ||
    defaultFastFieldShouldUpdate(newProps, oldProps)
  );
};

export const transformFormToRequest = (form) => {
  const entries = form.entries
    .filter((item) => item.expense_id && item.payment_amount)
    .map((entry) => ({
      expense_id: entry.expense_id,
      payment_amount: Number(entry.payment_amount),
      ...(entry.id ? { id: entry.id } : {}),
    }));

  return {
    ...form,
    amount: form.amount ? Number(form.amount) : undefined,
    exchange_rate: form.exchange_rate ? Number(form.exchange_rate) : undefined,
    entries: orderingLinesIndexes(entries),
  };
};

export const useSetPrimaryBranchToForm = () => {
  const { setFieldValue } = useFormikContext();
  const { branches, isBranchesSuccess, isNewMode } =
    useExpensePaymentFormContext();

  React.useEffect(() => {
    if (isBranchesSuccess && isNewMode) {
      const primaryBranch = branches.find((b) => b.primary) || first(branches);

      if (primaryBranch) {
        setFieldValue('branch_id', primaryBranch.id);
      }
    }
  }, [isBranchesSuccess, setFieldValue, branches, isNewMode]);
};

export const useExpensePaymentTotals = () => {
  const {
    values: { entries, currency_code: currencyCode },
  } = useFormikContext();

  const total = React.useMemo(() => sumBy(entries, 'payment_amount'), [entries]);
  const formattedTotal = React.useMemo(
    () => formattedAmount(total, currencyCode),
    [total, currencyCode],
  );

  return {
    total,
    formattedTotal,
  };
};

export const useExpensePaymentIsForeign = () => {
  const { values } = useFormikContext();
  const currentOrganization = useCurrentOrganization();

  return React.useMemo(
    () => values.currency_code !== currentOrganization.base_currency,
    [values.currency_code, currentOrganization.base_currency],
  );
};

export const transformErrors = (errors, { setFieldError }) => {
  const getError = (errorType) => errors.find((e) => e.type === errorType);

  if (getError('EXPENSE_PAYMENT_NUMBER_NOT_UNIQUE')) {
    setFieldError('payment_number', intl.get('payment_number_is_not_unique'));
  }
  if (getError('EXPENSE_PAYMENT_WITHDRAWAL_ACCOUNT_CURRENCY_INVALID')) {
    AppToaster.show({
      message: intl.get(
        'payment_made.error.withdrawal_account_currency_invalid',
      ),
      intent: Intent.DANGER,
    });
  }
  if (getError('EXPENSES_HAVE_DIFFERENT_PAYABLE_ACCOUNTS')) {
    AppToaster.show({
      message: intl.get(
        'expense_payment.error.expenses_have_different_payable_accounts',
      ),
      intent: Intent.DANGER,
    });
  }
};

export const useExpensePaymentFormContext = () =>
  React.useContext(ExpensePaymentFormContext);

export const ExpensePaymentFormContext = React.createContext();
