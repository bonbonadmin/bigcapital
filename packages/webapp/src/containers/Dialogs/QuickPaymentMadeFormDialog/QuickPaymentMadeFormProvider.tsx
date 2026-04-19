// @ts-nocheck
import React, { useMemo } from 'react';
import { DialogContent } from '@/components';
import {
  useBill,
  useExpense,
  useAccounts,
  useBranches,
  useCreatePaymentMade,
  useCreateExpensePayment,
  useVendor,
} from '@/hooks/query';
import { Features } from '@/constants';
import { useFeatureCan } from '@/hooks/state';
import { pick } from 'lodash';

const QuickPaymentMadeContext = React.createContext();

/**
 * Quick payment made dialog provider.
 */
function QuickPaymentMadeFormProvider({
  query,
  billId,
  expenseId,
  dialogName,
  ...props
}) {
  // Features guard.
  const { featureCan } = useFeatureCan();
  const isBranchFeatureCan = featureCan(Features.Branches);
  const resourceType = expenseId ? 'expense' : 'bill';

  // Handle fetch bill details.
  const { isLoading: isBillLoading, data: bill } = useBill(billId, {
    enabled: !!billId,
  });
  const { isLoading: isExpenseLoading, data: expense } = useExpense(expenseId, {
    enabled: !!expenseId,
  });

  const vendorId = bill?.vendor_id || expense?.payee_id;
  const { isLoading: isVendorLoading, data: vendor } = useVendor(vendorId, {
    enabled: !!vendorId,
  });

  // Handle fetch accounts data.
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();

  // Create payment made mutations.
  const { mutateAsync: createPaymentMadeMutate } = useCreatePaymentMade();
  const { mutateAsync: createExpensePaymentMutate } =
    useCreateExpensePayment();

  // Fetches the branches list.
  const {
    data: branches,
    isLoading: isBranchesLoading,
    isSuccess: isBranchesSuccess,
  } = useBranches(query, { enabled: isBranchFeatureCan });

  const resource = useMemo(() => {
    if (resourceType === 'expense') {
      return {
        ...pick(expense, ['id', 'due_amount', 'currency_code']),
        expense_id: expense?.id,
        vendor_id: expense?.payee_id,
        vendor_display_name: vendor?.display_name || '',
      };
    }
    return {
      ...pick(bill, ['id', 'due_amount', 'currency_code']),
      bill_id: bill?.id,
      vendor_id: bill?.vendor_id,
      vendor_display_name: vendor?.display_name || '',
    };
  }, [bill, expense, resourceType, vendor]);

  // State provider.
  const provider = {
    resource,
    resourceType,
    accounts,
    branches,
    dialogName,
    createPaymentMadeMutate,
    createExpensePaymentMutate,
    isBranchesSuccess,
  };

  return (
    <DialogContent
      isLoading={
        isAccountsLoading ||
        isBillLoading ||
        isExpenseLoading ||
        isVendorLoading ||
        isBranchesLoading
      }
    >
      <QuickPaymentMadeContext.Provider value={provider} {...props} />
    </DialogContent>
  );
}

const useQuickPaymentMadeContext = () =>
  React.useContext(QuickPaymentMadeContext);

export { QuickPaymentMadeFormProvider, useQuickPaymentMadeContext };
