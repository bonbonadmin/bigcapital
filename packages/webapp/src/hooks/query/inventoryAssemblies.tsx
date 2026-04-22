// @ts-nocheck
import { useMutation, useQueryClient } from 'react-query';
import useApiRequest from '../useRequest';
import t from './types';

const commonInvalidateQueries = (queryClient) => {
  queryClient.invalidateQueries(t.ITEMS);
  queryClient.invalidateQueries(t.ITEM);
  queryClient.invalidateQueries(t.INVENTORY_ADJUSTMENTS);
  queryClient.invalidateQueries(t.INVENTORY_ADJUSTMENT);
  queryClient.invalidateQueries(t.FINANCIAL_REPORT);
};

/**
 * Creates a new inventory assembly build transaction.
 */
export function useCreateInventoryAssembly(props) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (values) => apiRequest.post('inventory-assemblies', values),
    {
      onSuccess: () => {
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}
