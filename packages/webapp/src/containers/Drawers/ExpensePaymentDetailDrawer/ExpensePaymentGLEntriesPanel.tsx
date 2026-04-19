// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import { Card } from '@/components';
import JournalEntriesTable, {
  AmountDisplayedBaseCurrencyMessage,
} from '../../JournalEntriesTable/JournalEntriesTable';
import { useTransactionsByReference } from '@/hooks/query';
import { useExpensePaymentDetailContext } from './ExpensePaymentDetailProvider';

export default function ExpensePaymentGLEntriesPanel() {
  const { expensePaymentId } = useExpensePaymentDetailContext();
  const {
    data: { transactions },
    isLoading: isTransactionLoading,
  } = useTransactionsByReference(
    {
      reference_id: expensePaymentId,
      reference_type: 'ExpensePayment',
    },
    { enabled: !!expensePaymentId },
  );

  return (
    <ExpensePaymentGLEntriesRoot>
      <AmountDisplayedBaseCurrencyMessage />
      <JournalEntriesTable
        loading={isTransactionLoading}
        transactions={transactions}
      />
    </ExpensePaymentGLEntriesRoot>
  );
}

const ExpensePaymentGLEntriesRoot = styled(Card)``;
