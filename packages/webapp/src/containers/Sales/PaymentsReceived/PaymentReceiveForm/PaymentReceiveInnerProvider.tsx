// @ts-nocheck
import React, { createContext, useContext, useEffect } from 'react';
import { useFormikContext } from 'formik';
import { useDueInvoices } from '@/hooks/query';
import { transformInvoicesNewPageEntries } from './utils';
import { usePaymentReceiveFormContext } from './PaymentReceiveFormProvider';

const PaymentReceiveInnerContext = createContext();

/**
 * Payment receive inner form provider.
 */
function PaymentReceiveInnerProvider({ ...props }) {
  const { isNewMode } = usePaymentReceiveFormContext();

  // Formik context.
  const {
    values: { customer_id: customerId, amount },
    setFieldValue,
  } = useFormikContext();

  // Fetches customer receivable invoices.
  const {
    data: dueInvoices,
    isLoading: isDueInvoicesLoading,
    isFetching: isDueInvoicesFetching,
  } = useDueInvoices(customerId, {
    enabled: !!customerId && isNewMode,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (!isDueInvoicesFetching && dueInvoices && isNewMode) {
      const entries = transformInvoicesNewPageEntries(dueInvoices);
      setFieldValue('entries', entries);

      if (!amount && entries.length === 1) {
        setFieldValue('amount', entries[0].due_amount || '');
      }
    }
  }, [amount, isDueInvoicesFetching, dueInvoices, isNewMode, setFieldValue]);

  // Provider payload.
  const provider = {
    dueInvoices,
    isDueInvoicesLoading,
    isDueInvoicesFetching,
  };

  return <PaymentReceiveInnerContext.Provider value={provider} {...props} />;
}

const usePaymentReceiveInnerContext = () =>
  useContext(PaymentReceiveInnerContext);

export { PaymentReceiveInnerProvider, usePaymentReceiveInnerContext };
