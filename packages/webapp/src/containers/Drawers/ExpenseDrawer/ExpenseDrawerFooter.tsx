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

const getNumericExpenseField = (expense, snakeKey, camelKey) =>
  Number(expense?.[snakeKey] ?? expense?.[camelKey]) || 0;

const getExpenseDueAmount = (expense) => {
  const dueAmount = getNumericExpenseField(expense, 'due_amount', 'dueAmount');

  return Math.max(dueAmount, 0);
};

const getExpenseOverPaymentAmount = (expense) => {
  const overPaymentAmount = getNumericExpenseField(
    expense,
    'over_payment_amount',
    'overPaymentAmount',
  );

  return Math.max(overPaymentAmount, 0);
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
