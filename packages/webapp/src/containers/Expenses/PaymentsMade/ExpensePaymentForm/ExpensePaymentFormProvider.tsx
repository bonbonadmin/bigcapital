// @ts-nocheck
import React from 'react';
import { DashboardInsider } from '@/components';
import { Features } from '@/constants';
import { useFeatureCan } from '@/hooks/state';
import {
  useAccounts,
  useBranches,
  useCreateExpensePayment,
  useEditExpensePayment,
  useExpense,
  useExpensePaymentEditPage,
  useVendors,
} from '@/hooks/query';
import { ExpensePaymentFormContext } from './utils';

export function ExpensePaymentFormProvider({
  query,
  expensePaymentId,
  defaultExpenseId,
  ...props
}) {
  const { featureCan } = useFeatureCan();
  const isBranchFeatureCan = featureCan(Features.Branches);

  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();
  const {
    data: { vendors },
    isLoading: isVendorsLoading,
  } = useVendors({ page_size: 10000 });
  const {
    data: branches,
    isLoading: isBranchesLoading,
    isSuccess: isBranchesSuccess,
  } = useBranches(query, { enabled: isBranchFeatureCan });
  const {
    data: expensePaymentEditData,
    isLoading: isPaymentLoading,
  } = useExpensePaymentEditPage(expensePaymentId, {
    enabled: !!expensePaymentId,
  });
  const paymentEditPage = expensePaymentEditData?.expense_payment;
  const paymentEntriesEditPage = expensePaymentEditData?.entries;

  const {
    data: defaultExpense,
    isLoading: isDefaultExpenseLoading,
  } = useExpense(defaultExpenseId, {
    enabled: !!defaultExpenseId,
  });

  const { mutateAsync: createExpensePaymentMutate } = useCreateExpensePayment();
  const { mutateAsync: editExpensePaymentMutate } = useEditExpensePayment();

  const [submitPayload, setSubmitPayload] = React.useState({});
  const [isNewEntriesFetching, setIsNewEntriesFetching] = React.useState(false);

  const provider = {
    isNewMode: !expensePaymentId,
    expensePaymentId,
    defaultExpenseId,
    defaultExpense,
    accounts,
    vendors,
    branches,
    paymentEditPage,
    paymentEntriesEditPage,
    submitPayload,
    isBranchesSuccess,
    isNewEntriesFetching,
    setIsNewEntriesFetching,
    createExpensePaymentMutate,
    editExpensePaymentMutate,
    setSubmitPayload,
  };

  return (
    <DashboardInsider
      loading={
        isAccountsLoading ||
        isVendorsLoading ||
        isBranchesLoading ||
        isPaymentLoading ||
        isDefaultExpenseLoading
      }
      name={'expense-payment-form'}
    >
      <ExpensePaymentFormContext.Provider value={provider} {...props} />
    </DashboardInsider>
  );
}
