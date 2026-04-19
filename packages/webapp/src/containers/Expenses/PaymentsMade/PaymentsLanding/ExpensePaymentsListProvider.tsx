// @ts-nocheck
import React, { createContext } from 'react';
import { DashboardInsider } from '@/components/Dashboard';
import { useExpensePayments } from '@/hooks/query';

const ExpensePaymentsListContext = createContext();

export function ExpensePaymentsListProvider({ query, ...props }) {
  const {
    data: { expensePayments, pagination },
    isLoading: isPaymentsLoading,
    isFetching: isPaymentsFetching,
  } = useExpensePayments(query, { keepPreviousData: true });

  const provider = {
    expensePayments,
    pagination,
    isPaymentsLoading,
    isPaymentsFetching,
  };

  return (
    <DashboardInsider loading={false} name={'expense-payments-list'}>
      <ExpensePaymentsListContext.Provider value={provider} {...props} />
    </DashboardInsider>
  );
}

export const useExpensePaymentsListContext = () =>
  React.useContext(ExpensePaymentsListContext);
