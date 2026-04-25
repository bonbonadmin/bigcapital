// @ts-nocheck
import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import ExpenseForm from './ExpenseForm';
import { ExpenseFormPageProvider } from './ExpenseFormPageProvider';
import { EXPENSE_FORM_MODE } from './constants';

/**
 * Expense page form.
 */
export default function ExpenseFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const expenseId = parseInt(id, 10);
  const searchParams = new URLSearchParams(location.search);
  const billImageId = parseInt(searchParams.get('bill_image_id'), 10);
  const expenseMode =
    searchParams.get('mode') === EXPENSE_FORM_MODE.PAYABLE
      ? EXPENSE_FORM_MODE.PAYABLE
      : EXPENSE_FORM_MODE.PAID;

  return (
    <ExpenseFormPageProvider
      expenseId={expenseId}
      expenseMode={expenseMode}
      billImageId={billImageId}
    >
      <ExpenseForm />
    </ExpenseFormPageProvider>
  );
}
