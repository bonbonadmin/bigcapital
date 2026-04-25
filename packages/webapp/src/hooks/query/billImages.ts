// @ts-nocheck
import { useMutation, useQueryClient } from 'react-query';
import useApiRequest from '../useRequest';
import { transformToCamelCase } from '@/utils';
import { useRequestQuery } from '../useQueryRequest';

export const BillImageSummaryQueryKey = 'BillImageSummary';

export function useUploadBillImage(props) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (values) =>
      apiRequest
        .post('expenses/bill-images', values)
        .then((res) => transformToCamelCase(res.data?.data)),
    {
      ...props,
      onSuccess: (...args) => {
        queryClient.invalidateQueries(BillImageSummaryQueryKey);
        props?.onSuccess?.(...args);
      },
    },
  );
}

export function useBillImageSummary(props) {
  return useRequestQuery(
    [BillImageSummaryQueryKey],
    { method: 'get', url: 'expenses/bill-images/summary' },
    {
      select: (res) => transformToCamelCase(res.data?.data),
      defaultData: {
        mapPendingCount: 0,
        reviewPendingCount: 0,
      },
      ...props,
    },
  );
}

export function useNextBillImageReview(props) {
  const apiRequest = useApiRequest();

  return useMutation(
    () =>
      apiRequest
        .get('expenses/bill-images/review-next')
        .then((res) => transformToCamelCase(res.data?.data)),
    props,
  );
}

export function useBillImageReview(id, props) {
  return useRequestQuery(
    [BillImageSummaryQueryKey, 'review', id],
    { method: 'get', url: `expenses/bill-images/${id}/review` },
    {
      select: (res) => transformToCamelCase(res.data?.data),
      defaultData: null,
      enabled: !!id,
      ...props,
    },
  );
}

export function useMarkBillImagePublished(props) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (id) =>
      apiRequest
        .post(`expenses/bill-images/${id}/mark-published`)
        .then((res) => transformToCamelCase(res.data?.data)),
    {
      ...props,
      onSuccess: (...args) => {
        queryClient.invalidateQueries(BillImageSummaryQueryKey);
        props?.onSuccess?.(...args);
      },
    },
  );
}

export function useProcessBillImageMap(props) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    () =>
      apiRequest
        .post('expenses/bill-images/process-map')
        .then((res) => transformToCamelCase(res.data?.data || res.data)),
    {
      ...props,
      onSuccess: (...args) => {
        queryClient.invalidateQueries(BillImageSummaryQueryKey);
        props?.onSuccess?.(...args);
      },
    },
  );
}
