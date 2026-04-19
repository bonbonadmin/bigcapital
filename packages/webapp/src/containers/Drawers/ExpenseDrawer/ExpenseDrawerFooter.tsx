// @ts-nocheck
import React from 'react';
import styled from 'styled-components';

import {
  T,
  TotalLines,
  TotalLineBorderStyle,
  TotalLineTextStyle,
  Money,
} from '@/components';
import { useExpenseDrawerContext } from './ExpenseDrawerProvider';
import { TotalLine } from '@/components';

const getExpenseDueAmount = (expense) => {
  const totalAmount = Number(expense.total_amount) || 0;
  const paymentAmount = Number(expense.payment_amount) || 0;

  return Math.max(totalAmount - paymentAmount, 0);
};

const getExpenseOverPaymentAmount = (expense) => {
  const totalAmount = Number(expense.total_amount) || 0;
  const paymentAmount = Number(expense.payment_amount) || 0;

  return Math.max(paymentAmount - totalAmount, 0);
};

/**
 * Footer details of expense readonly details.
 */
export default function ExpenseDrawerFooter() {
  const { expense } = useExpenseDrawerContext();
  const dueAmount = getExpenseDueAmount(expense);
  const overPaymentAmount = getExpenseOverPaymentAmount(expense);

  return (
    <ExpenseDetailsFooterRoot>
      <ExpenseTotalLines labelColWidth={'180px'} amountColWidth={'180px'}>
        <TotalLine
          title={<T id={'expense.details.subtotal'} />}
          value={expense.formatted_amount}
          borderStyle={TotalLineBorderStyle.SingleDark}
        />
        <TotalLine
          title={<T id={'expense.details.total'} />}
          value={expense.formatted_amount}
          borderStyle={TotalLineBorderStyle.DoubleDark}
          textStyle={TotalLineTextStyle.Bold}
        />
        <TotalLine
          title={<T id={'payment_amount'} />}
          value={expense.formatted_payment_amount}
        />
        <TotalLine
          title={
            <T
              id={expense.is_over_paid ? 'over_payment_amount' : 'due_amount'}
            />
          }
          value={
            <Money
              amount={expense.is_over_paid ? overPaymentAmount : dueAmount}
              currency={expense.currency_code}
            />
          }
          textStyle={TotalLineTextStyle.Bold}
        />
      </ExpenseTotalLines>
    </ExpenseDetailsFooterRoot>
  );
}

export const ExpenseDetailsFooterRoot = styled.div``;

export const ExpenseTotalLines = styled(TotalLines)`
  margin-left: auto;
`;
