// @ts-nocheck
import { useMutation } from 'react-query';
import useApiRequest from '../useRequest';

export function useEmbedTransactions(props) {
  const apiRequest = useApiRequest();

  return useMutation(
    () => apiRequest.post('settings/ai/embed-transactions'),
    props,
  );
}

export function useEmbedVendors(props) {
  const apiRequest = useApiRequest();

  return useMutation(() => apiRequest.post('settings/ai/embed-vendors'), props);
}
