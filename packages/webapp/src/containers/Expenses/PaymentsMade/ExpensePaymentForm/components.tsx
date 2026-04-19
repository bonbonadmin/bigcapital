// @ts-nocheck
import React from 'react';
import moment from 'moment';
import { Money, ExchangeRateInputGroup } from '@/components';
import { MoneyFieldCell } from '@/components/DataTableCells';
import { useFormikContext } from 'formik';
import { useCurrentOrganization } from '@/hooks/state';
import { useExpensePaymentIsForeign } from './utils';

function ExpenseReferenceAccessor(row) {
  return row?.reference_no ? row?.reference_no : '-';
}

function ExpenseDateCell({ value }) {
  return value ? moment(value).format('YYYY MMM DD') : '-';
}

function MoneyTableCell({ row: { original }, value }) {
  return <Money amount={value} currency={original.currency_code} />;
}

export function useExpensePaymentEntriesTableColumns() {
  return React.useMemo(
    () => [
      {
        Header: 'Expense date',
        id: 'date',
        accessor: 'date',
        Cell: ExpenseDateCell,
        disableSortBy: true,
        width: 120,
      },
      {
        Header: 'Reference No.',
        accessor: ExpenseReferenceAccessor,
        disableSortBy: true,
        width: 140,
      },
      {
        Header: 'Expense amount',
        accessor: 'amount',
        Cell: MoneyTableCell,
        disableSortBy: true,
        width: 150,
      },
      {
        Header: 'Amount due',
        accessor: 'due_amount',
        Cell: MoneyTableCell,
        disableSortBy: true,
        width: 150,
      },
      {
        Header: 'Payment amount',
        accessor: 'payment_amount',
        Cell: MoneyFieldCell,
        disableSortBy: true,
        width: 150,
      },
    ],
    [],
  );
}

export function ExpensePaymentExchangeRateInputField({ ...props }) {
  const currentOrganization = useCurrentOrganization();
  const { values } = useFormikContext();
  const isForeign = useExpensePaymentIsForeign();

  if (!isForeign) {
    return null;
  }
  return (
    <ExchangeRateInputGroup
      fromCurrency={values.currency_code}
      toCurrency={currentOrganization.base_currency}
      {...props}
    />
  );
}
