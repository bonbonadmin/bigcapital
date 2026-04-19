// @ts-nocheck
import React from 'react';
import { DrawerBody } from '@/components';
import ExpensePaymentDetails from './ExpensePaymentDetails';
import { ExpensePaymentDetailProvider } from './ExpensePaymentDetailProvider';

export default function ExpensePaymentDetailContent({ expensePaymentId }) {
  return (
    <ExpensePaymentDetailProvider expensePaymentId={expensePaymentId}>
      <DrawerBody>
        <ExpensePaymentDetails />
      </DrawerBody>
    </ExpensePaymentDetailProvider>
  );
}
