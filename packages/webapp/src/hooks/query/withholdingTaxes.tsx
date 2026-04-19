// @ts-nocheck
import { useMutation, useQueryClient } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import QUERY_TYPES from './types';

const commonInvalidateQueries = (queryClient) => {
  queryClient.invalidateQueries(QUERY_TYPES.WITHHOLDING_TAXES);
};

export function useWithholdingTaxes(props) {
  return useRequestQuery(
    [QUERY_TYPES.WITHHOLDING_TAXES],
    {
      method: 'get',
      url: 'withholding-taxes',
    },
    {
      select: (res) => res.data.data,
      defaultData: [],
      ...props,
    },
  );
}

export function useWithholdingTax(withholdingTaxId, props) {
  return useRequestQuery(
    [QUERY_TYPES.WITHHOLDING_TAXES, withholdingTaxId],
    {
      method: 'get',
      url: `withholding-taxes/${withholdingTaxId}`,
    },
    {
      select: (res) => res.data,
      enabled: !!withholdingTaxId,
      ...props,
    },
  );
}

export function useCreateWithholdingTax(props) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (values) => apiRequest.post('withholding-taxes', values),
    {
      onSuccess: () => {
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

export function useEditWithholdingTax(props) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]) => apiRequest.put(`withholding-taxes/${id}`, values),
    {
      onSuccess: (res, [id]) => {
        commonInvalidateQueries(queryClient);
        queryClient.invalidateQueries([QUERY_TYPES.WITHHOLDING_TAXES, id]);
      },
      ...props,
    },
  );
}

export function useDeleteWithholdingTax(props) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id) => apiRequest.delete(`withholding-taxes/${id}`), {
    onSuccess: (res, id) => {
      commonInvalidateQueries(queryClient);
      queryClient.invalidateQueries([QUERY_TYPES.WITHHOLDING_TAXES, id]);
    },
    ...props,
  });
}
