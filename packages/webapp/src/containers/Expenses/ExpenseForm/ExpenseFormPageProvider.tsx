// @ts-nocheck
import React, { createContext } from 'react';
import { css } from '@emotion/css';
import { DashboardInsider } from '@/components/Dashboard';
import { Features } from '@/constants';
import { useFeatureCan } from '@/hooks/state';
import {
  useCurrencies,
  useBillImageReview,
  useExpense,
  useAccounts,
  useBranches,
  useCreateExpense,
  useEditExpense,
  useTaxRates,
  useVendors,
  useWithholdingTaxes,
} from '@/hooks/query';
import { useProjects } from '@/containers/Projects/hooks';

const ExpenseFormPageContext = createContext();

/**
 * Accounts chart data provider.
 */
function ExpenseFormPageProvider({
  query,
  expenseId,
  expenseMode,
  billImageId,
  ...props
}) {
  // Features guard.
  const { featureCan } = useFeatureCan();
  const isBranchFeatureCan = featureCan(Features.Branches);
  const isProjectsFeatureCan = featureCan(Features.Projects);

  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencies();

  // Fetches vendors list.
  const {
    data: { vendors },
    isLoading: isVendorsLoading,
  } = useVendors({ page_size: 10000 });

  // Fetch the expense details.
  const { data: expense, isLoading: isExpenseLoading } = useExpense(expenseId, {
    enabled: !!expenseId,
  });
  const {
    data: billImageReview,
    isLoading: isBillImageReviewLoading,
  } = useBillImageReview(billImageId, {
    enabled: !!billImageId && !expenseId,
  });

  // Fetches the branches list.
  const {
    data: branches,
    isLoading: isBranchesLoading,
    isSuccess: isBranchesSuccess,
  } = useBranches(query, { enabled: isBranchFeatureCan });

  // Fetch accounts list.
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();

  // Fetch the  projects list.
  const {
    data: { projects },
    isLoading: isProjectsLoading,
  } = useProjects({}, { enabled: !!isProjectsFeatureCan });

  const {
    data: taxRates,
    isLoading: isTaxRatesLoading,
  } = useTaxRates();

  const {
    data: withholdingTaxes,
    isLoading: isWithholdingTaxesLoading,
  } = useWithholdingTaxes();

  // Create and edit expense mutate.
  const { mutateAsync: createExpenseMutate } = useCreateExpense();
  const { mutateAsync: editExpenseMutate } = useEditExpense();

  // Submit form payload - using ref for synchronous access.
  const submitPayloadRef = React.useRef({});

  // Setter to update the ref.
  const setSubmitPayload = React.useCallback((payload) => {
    submitPayloadRef.current = payload;
  }, []);

  // Detarmines whether the form in new mode.
  const isNewMode = !expenseId;

  // Provider payload.
  const provider = {
    isNewMode,
    expenseId,
    billImageId,
    expenseMode:
      expense?.payable_account_id || expense?.payableAccountId
        ? 'payable'
        : expenseMode,
    isBillImageReviewMode: !!billImageId && !expenseId,
    submitPayloadRef, // Expose ref for synchronous access

    currencies,
    vendors,
    expense,
    billImageReview,
    accounts,
    branches,
    projects,
    taxRates,
    withholdingTaxes,

    isCurrenciesLoading,
    isExpenseLoading,
    isBillImageReviewLoading,
    isVendorsLoading,
    isAccountsLoading,
    isBranchesSuccess,
    isTaxRatesLoading,
    isWithholdingTaxesLoading,

    createExpenseMutate,
    editExpenseMutate,
    setSubmitPayload,
  };

  return (
    <DashboardInsider
      loading={
        isCurrenciesLoading ||
        isExpenseLoading ||
        isBillImageReviewLoading ||
        isVendorsLoading ||
        isAccountsLoading ||
        isProjectsLoading ||
        isTaxRatesLoading ||
        isWithholdingTaxesLoading
      }
      name={'expense-form'}
      className={css`
        min-height: calc(100vh - var(--top-offset));
        max-height: calc(100vh - var(--top-offset));
      `}
    >
      <ExpenseFormPageContext.Provider value={provider} {...props} />
    </DashboardInsider>
  );
}

const useExpenseFormContext = () => React.useContext(ExpenseFormPageContext);

export { ExpenseFormPageProvider, useExpenseFormContext };
