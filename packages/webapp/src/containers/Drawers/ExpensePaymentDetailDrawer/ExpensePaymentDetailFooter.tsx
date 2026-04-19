// @ts-nocheck
import React from 'react';
import {
  CommercialDocFooter,
  DetailItem,
  DetailsMenu,
  If,
  T,
} from '@/components';
import { useExpensePaymentDetailContext } from './ExpensePaymentDetailProvider';

export function ExpensePaymentDetailFooter() {
  const { expensePayment } = useExpensePaymentDetailContext();

  return (
    <CommercialDocFooter>
      <DetailsMenu direction={'horizantal'} minLabelSize={'180px'}>
        <If condition={expensePayment.statement}>
          <DetailItem
            label={<T id={'payment_made.details.statement'} />}
            multiline
          >
            {expensePayment.statement}
          </DetailItem>
        </If>
      </DetailsMenu>
    </CommercialDocFooter>
  );
}
