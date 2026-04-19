// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { DrawerHeaderContent, DrawerLoading } from '@/components';
import { useExpensePayment } from '@/hooks/query';
import { useFeatureCan } from '@/hooks/state';
import { Features } from '@/constants';

const ExpensePaymentDetailContext = React.createContext();

function ExpensePaymentDetailProvider({ expensePaymentId, ...props }) {
  const { featureCan } = useFeatureCan();
  const { data: expensePayment, isLoading: isExpensePaymentLoading } =
    useExpensePayment(expensePaymentId, {
      enabled: !!expensePaymentId,
    });

  const provider = {
    expensePaymentId,
    expensePayment,
  };

  return (
    <DrawerLoading loading={isExpensePaymentLoading}>
      <DrawerHeaderContent
        name="expense-payment-detail-drawer"
        title={intl.get('payment_made.drawer.title', {
          number: expensePayment.payment_number
            ? `(${expensePayment.payment_number})`
            : '',
        })}
        subTitle={
          featureCan(Features.Branches)
            ? intl.get('payment_made.drawer.subtitle', {
                value: expensePayment.branch?.name,
              })
            : null
        }
      />
      <ExpensePaymentDetailContext.Provider value={provider} {...props} />
    </DrawerLoading>
  );
}

const useExpensePaymentDetailContext = () =>
  React.useContext(ExpensePaymentDetailContext);

export { ExpensePaymentDetailProvider, useExpensePaymentDetailContext };
