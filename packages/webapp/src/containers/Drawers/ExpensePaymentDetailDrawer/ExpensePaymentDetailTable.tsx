// @ts-nocheck
import React from 'react';
import { CommercialDocEntriesTable } from '@/components';
import { TableStyle } from '@/constants';
import { useExpensePaymentEntriesColumns } from './utils';
import { useExpensePaymentDetailContext } from './ExpensePaymentDetailProvider';

export default function ExpensePaymentDetailTable() {
  const columns = useExpensePaymentEntriesColumns();
  const { expensePayment } = useExpensePaymentDetailContext();

  return (
    <CommercialDocEntriesTable
      columns={columns}
      data={expensePayment.entries}
      styleName={TableStyle.Constrant}
    />
  );
}
