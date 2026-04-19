// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { getColumnWidth } from '@/utils';
import { useExpensePaymentDetailContext } from './ExpensePaymentDetailProvider';

export const useExpensePaymentEntriesColumns = () => {
  const {
    expensePayment: { entries },
  } = useExpensePaymentDetailContext();

  return React.useMemo(
    () => [
      {
        Header: intl.get('date'),
        accessor: 'expense.formatted_date',
        width: 100,
        disableSortBy: true,
        className: 'date',
      },
      {
        Header: intl.get('reference_no'),
        accessor: 'expense.reference_no',
        width: 150,
        disableSortBy: true,
        className: 'reference_no',
      },
      {
        Header: intl.get('full_amount'),
        accessor: 'expense.formatted_amount',
        width: getColumnWidth(entries, 'expense.formatted_amount', {
          minWidth: 60,
          magicSpacing: 5,
        }),
        disableSortBy: true,
        align: 'right',
      },
      {
        Header: intl.get('due_amount'),
        accessor: 'expense.formatted_due_amount',
        width: getColumnWidth(entries, 'expense.formatted_due_amount', {
          minWidth: 60,
          magicSpacing: 5,
        }),
        disableSortBy: true,
        align: 'right',
      },
      {
        Header: intl.get('payment_amount'),
        accessor: 'payment_amount_formatted',
        width: getColumnWidth(entries, 'payment_amount_formatted', {
          minWidth: 60,
          magicSpacing: 5,
        }),
        disableSortBy: true,
        textOverview: true,
        align: 'right',
      },
    ],
    [],
  );
};
