// @ts-nocheck
import React from 'react';
import { CommercialDocBox } from '@/components';
import ExpensePaymentDetailHeader from './ExpensePaymentDetailHeader';
import ExpensePaymentDetailTable from './ExpensePaymentDetailTable';
import ExpensePaymentDetailTableFooter from './ExpensePaymentDetailTableFooter';
import { ExpensePaymentDetailFooter } from './ExpensePaymentDetailFooter';

export default function ExpensePaymentDetailTab() {
  return (
    <CommercialDocBox>
      <ExpensePaymentDetailHeader />
      <ExpensePaymentDetailTable />
      <ExpensePaymentDetailTableFooter />
      <ExpensePaymentDetailFooter />
    </CommercialDocBox>
  );
}
