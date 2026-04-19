// @ts-nocheck
import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import ExpensePaymentForm from './ExpensePaymentForm';
import { ExpensePaymentFormProvider } from './ExpensePaymentFormProvider';

import '@/style/pages/PaymentMade/PageForm.scss';

export default function ExpensePaymentFormPage() {
  const { id: expensePaymentId } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const defaultExpenseId = searchParams.get('expense_id');

  return (
    <ExpensePaymentFormProvider
      expensePaymentId={expensePaymentId}
      defaultExpenseId={defaultExpenseId}
    >
      <ExpensePaymentForm />
    </ExpensePaymentFormProvider>
  );
}
