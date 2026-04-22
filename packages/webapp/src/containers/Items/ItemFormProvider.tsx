// @ts-nocheck
import React, { createContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  useItem,
  useSettingsItems,
  useItemsCategories,
  useItems,
  useCreateItem,
  useEditItem,
  useAccounts,
} from '@/hooks/query';
import { useWatchItemError } from './utils';
import { useTaxRates } from '@/hooks/query/taxRates';

const ItemFormContext = createContext();

/**
 * Accounts chart data provider.
 */
function ItemFormProvider({ itemId, ...props }) {
  const { state } = useLocation();

  const duplicateId = state?.action;

  // Fetches the accounts list.
  const { isLoading: isAccountsLoading, data: accounts } = useAccounts();

  // Fetches the items categories list.
  const {
    isLoading: isItemsCategoriesLoading,
    data: { itemsCategories },
  } = useItemsCategories();

  const {
    data: { items: inventoryItems },
    isLoading: isInventoryItemsLoading,
  } = useItems({
    page_size: 10000,
    stringified_filter_roles: JSON.stringify([
      {
        index: 1,
        fieldKey: 'type',
        value: 'inventory',
        condition: '&&',
        comparator: 'equals',
      },
    ]),
  });

  const { data: taxRates, isLoading: isTaxRatesLoading } = useTaxRates();

  // Fetches the given item details.
  const itemQuery = useItem(itemId || duplicateId, {
    enabled: !!itemId || !!duplicateId,
  });

  const { isLoading: isItemLoading, data: item } = itemQuery;

  // Watches and handles item not found response error.
  useWatchItemError(itemQuery);

  // Fetches item settings.
  const {
    isLoading: isItemsSettingsLoading,
    isFetching: isItemsSettingsFetching,
  } = useSettingsItems();

  // Create and edit item mutations.
  const { mutateAsync: editItemMutate } = useEditItem();
  const { mutateAsync: createItemMutate } = useCreateItem();

  // Holds data of submit button once clicked to form submit function.
  const [submitPayload, setSubmitPayload] = useState({});

  // Detarmines whether the form new mode.
  const isNewMode = duplicateId || !itemId;

  // Detarmines the form loading state.
  const isFormLoading =
    isItemsSettingsLoading ||
    isAccountsLoading ||
    isInventoryItemsLoading ||
    isItemsCategoriesLoading ||
    isItemLoading;

  // Provider state.
  const provider = {
    itemId,
    accounts,
    item,
    inventoryItems,
    itemsCategories,
    taxRates,
    submitPayload,
    isNewMode,

    isFormLoading,
    isAccountsLoading,
    isItemsCategoriesLoading,
    isInventoryItemsLoading,
    isItemLoading,
    isTaxRatesLoading,

    createItemMutate,
    editItemMutate,
    setSubmitPayload,
  };

  return <ItemFormContext.Provider value={provider} {...props} />;
}

const useItemFormContext = () => React.useContext(ItemFormContext);

export { ItemFormProvider, useItemFormContext };
