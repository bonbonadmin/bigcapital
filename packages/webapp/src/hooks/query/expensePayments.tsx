// @ts-nocheck
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import { transformPagination } from '@/utils';
import useApiRequest from '../useRequest';
import t from './types';

const commonInvalidateQueries = (client) => {
  client.invalidateQueries(t.EXPENSE_PAYMENTS);
  client.invalidateQueries(t.EXPENSE_PAYMENT);
  client.invalidateQueries(t.EXPENSE_PAYMENT_NEW_ENTRIES);
  client.invalidateQueries(t.EXPENSE_PAYMENT_EDIT_PAGE);
  client.invalidateQueries(t.EXPENSES);
  client.invalidateQueries(t.EXPENSE);
  client.invalidateQueries(t.ACCOUNTS);
  client.invalidateQueries(t.ACCOUNT);
  client.invalidateQueries(t.VENDORS);
  client.invalidateQueries(t.VENDOR);
  client.invalidateQueries(t.FINANCIAL_REPORT);
  client.invalidateQueries(t.CASH_FLOW_TRANSACTIONS);
  client.invalidateQueries(t.CASHFLOW_ACCOUNT_TRANSACTIONS_INFINITY);
};

export function useExpensePayments(query, props) {
  return useRequestQuery(
    [t.EXPENSE_PAYMENTS, query],
    { url: 'expense-payments', params: query },
    {
      select: (res) => ({
        expensePayments: res.data.expense_payments,
        pagination: transformPagination(res.data.pagination),
      }),
      defaultData: {
        expensePayments: [],
        pagination: {},
      },
      ...props,
    },
  );
}

export function useCreateExpensePayment(props) {
  const client = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((values) => apiRequest.post('expense-payments', values), {
    onSuccess: () => {
      commonInvalidateQueries(client);
    },
    ...props,
  });
}

export function useEditExpensePayment(props) {
  const client = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]) => apiRequest.put(`expense-payments/${id}`, values),
    {
      onSuccess: () => {
        commonInvalidateQueries(client);
      },
      ...props,
    },
  );
}

export function useDeleteExpensePayment(props) {
  const client = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id) => apiRequest.delete(`expense-payments/${id}`), {
    onSuccess: (res, id) => {
      commonInvalidateQueries(client);
      client.invalidateQueries([t.EXPENSE_PAYMENT, id]);
    },
    ...props,
  });
}

export function useExpensePayment(id, props) {
  return useRequestQuery(
    [t.EXPENSE_PAYMENT, id],
    {
      method: 'get',
      url: `expense-payments/${id}`,
    },
    {
      select: (res) => res.data,
      defaultData: {},
      ...props,
    },
  );
}

export function useExpensePaymentEditPage(id, props) {
  const apiRequest = useApiRequest();

  return useQuery(
    [t.EXPENSE_PAYMENT_EDIT_PAGE, id],
    () =>
      apiRequest
        .get(`expense-payments/${id}/edit-page`)
        .then((res) => res.data),
    props,
  );
}

export function useExpensePaymentNewPageEntries(vendorId, props) {
  return useRequestQuery(
    [t.EXPENSE_PAYMENT_NEW_ENTRIES, vendorId],
    {
      method: 'get',
      url: 'expense-payments/new-page/entries',
      params: { vendor_id: vendorId },
    },
    {
      select: (res) => res.data,
      defaultData: [],
      ...props,
    },
  );
}

export function useRefreshExpensePayments() {
  const queryClient = useQueryClient();

  return {
    refresh: () => {
      queryClient.invalidateQueries(t.EXPENSE_PAYMENTS);
    },
  };
}
