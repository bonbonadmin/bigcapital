// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import {
  T,
  TotalLine,
  TotalLineBorderStyle,
  TotalLineTextStyle,
  TotalLines,
} from '@/components';
import { useExpensePaymentDetailContext } from './ExpensePaymentDetailProvider';

export default function ExpensePaymentDetailTableFooter() {
  const { expensePayment } = useExpensePaymentDetailContext();

  return (
    <ExpensePaymentFooterRoot>
      <ExpensePaymentTotalLines labelColWidth={'180px'} amountColWidth={'180px'}>
        <TotalLine
          title={<T id={'payment_made.details.subtotal'} />}
          value={expensePayment.formatted_amount}
          borderStyle={TotalLineBorderStyle.SingleDark}
        />
        <TotalLine
          title={<T id={'payment_made.details.total'} />}
          value={expensePayment.formatted_amount}
          borderStyle={TotalLineBorderStyle.DoubleDark}
          textStyle={TotalLineTextStyle.Bold}
        />
      </ExpensePaymentTotalLines>
    </ExpensePaymentFooterRoot>
  );
}

export const ExpensePaymentFooterRoot = styled.div``;

export const ExpensePaymentTotalLines = styled(TotalLines)`
  margin-left: auto;
`;
