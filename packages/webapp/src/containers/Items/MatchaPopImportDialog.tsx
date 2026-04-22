// @ts-nocheck
import React from 'react';
import {
  Button,
  Callout,
  Checkbox,
  Classes,
  Dialog,
  DialogBody,
  DialogFooter,
  HTMLSelect,
  HTMLTable,
  Intent,
} from '@blueprintjs/core';
import { AppToaster, FormattedMessage as T } from '@/components';
import { useItemsCategories, useImportMatchaPopItems } from '@/hooks/query';
import { itemUnitOfMeasureOptions } from './utils';

const ITEM_TYPE_OPTIONS = [
  { value: '', label: 'Select type' },
  { value: 'service', label: 'Service' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'inventory-assembly', label: 'Inventory Assembly' },
];

const UNIT_OF_MEASURE_OPTIONS = [
  { value: '', label: 'Select UOM' },
  ...itemUnitOfMeasureOptions.map((option) => ({
    value: option.key,
    label: option.label,
  })),
];

const buildInitialRows = (importCandidates, itemsCategories) =>
  (importCandidates || []).map((candidate) => {
    const matchedCategory = (itemsCategories || []).find(
      (category) =>
        `${category.name || ''}`.trim().toLowerCase() ===
        `${candidate.category_name || ''}`.trim().toLowerCase(),
    );

    return {
      checked: true,
      external_id: candidate.external_id,
      name: candidate.name,
      code: candidate.code || '',
      category_name: candidate.category_name,
      category_id: matchedCategory?.id || '',
      item_type: '',
      unit_of_measure: '',
      cost_price: candidate.cost_price || 0,
      sell_price: candidate.sell_price || 0,
    };
  });

const findMatchedCategoryId = (categoryName, itemsCategories) => {
  const matchedCategory = (itemsCategories || []).find(
    (category) =>
      `${category.name || ''}`.trim().toLowerCase() ===
      `${categoryName || ''}`.trim().toLowerCase(),
  );

  return matchedCategory?.id || '';
};

export function MatchaPopImportDialog({
  isOpen,
  importCandidates,
  onClose,
}) {
  const [rows, setRows] = React.useState([]);

  const {
    data: { itemsCategories },
    isLoading: isCategoriesLoading,
  } = useItemsCategories(
    { page_size: 1000 },
    {
      enabled: isOpen,
    },
  );

  const { mutateAsync: importMatchaPopItemsMutate, isLoading: isImporting } =
    useImportMatchaPopItems();

  React.useEffect(() => {
    if (!isOpen) {
      setRows([]);
      return;
    }

    if (rows.length === 0 && importCandidates?.length) {
      setRows(buildInitialRows(importCandidates, itemsCategories));
    }
  }, [isOpen, importCandidates, itemsCategories, rows.length]);

  React.useEffect(() => {
    if (!isOpen || !itemsCategories?.length || rows.length === 0) return;

    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.category_id || !row.category_name) return row;

        const matchedCategoryId = findMatchedCategoryId(
          row.category_name,
          itemsCategories,
        );

        return matchedCategoryId
          ? { ...row, category_id: matchedCategoryId }
          : row;
      }),
    );
  }, [isOpen, itemsCategories, rows.length]);

  const updateRow = (externalId, patch) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.external_id === externalId ? { ...row, ...patch } : row,
      ),
    );
  };

  const selectableRows = rows.filter((row) => row.checked);
  const hasInvalidSelections = selectableRows.some(
    (row) => !row.item_type || !row.unit_of_measure,
  );

  const handleToggleAll = (checked) => {
    setRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        checked,
      })),
    );
  };

  const handleSave = async () => {
    if (selectableRows.length === 0) {
      AppToaster.show({
        intent: Intent.WARNING,
        message: 'Choose at least one product to import.',
      });
      return;
    }
    if (hasInvalidSelections) {
      AppToaster.show({
        intent: Intent.DANGER,
        message: 'Select both item type and unit of measure for each checked row.',
      });
      return;
    }

    const payload = {
      items: selectableRows.map((row) => ({
        external_id: row.external_id,
        name: row.name,
        code: row.code,
        type: row.item_type,
        unit_of_measure: row.unit_of_measure,
        category_id: row.category_id || undefined,
        cost_price: row.cost_price,
        sell_price: row.sell_price,
      })),
    };

    try {
      const response = await importMatchaPopItemsMutate(payload);
      const result = response?.data || {};

      AppToaster.show({
        intent: Intent.SUCCESS,
        message: `${result.created_count || 0} ERP items imported successfully.`,
      });

      if ((result.skipped_external_ids || []).length > 0) {
        AppToaster.show({
          intent: Intent.WARNING,
          message: `${result.skipped_external_ids.length} items were skipped because they already exist.`,
        });
      }

      if ((result.imported_assembly_count || 0) > 0) {
        AppToaster.show({
          intent: Intent.WARNING,
          message:
            'Some imported items are inventory assemblies. Remember to set their assembly components.',
        });
      }

      onClose();
    } catch (error) {
      AppToaster.show({
        intent: Intent.DANGER,
        message:
          error?.response?.data?.message ||
          'Failed to import selected ERP products.',
      });
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Import ERP Products"
      style={{ width: '92vw', maxWidth: 1200 }}
    >
      <DialogBody>
        <Callout intent={Intent.PRIMARY} style={{ marginBottom: '1rem' }}>
          Existing items with matching `external_id` were already synced. Choose
          which missing ERP products to import as new items.
        </Callout>

        <div style={{ marginBottom: '0.75rem' }}>
          <Checkbox
            checked={rows.length > 0 && rows.every((row) => row.checked)}
            indeterminate={
              rows.some((row) => row.checked) && !rows.every((row) => row.checked)
            }
            label="Select all import candidates"
            onChange={(event) => handleToggleAll(event.currentTarget.checked)}
          />
        </div>

        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <HTMLTable bordered interactive style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 70 }}>Import</th>
                <th>Name</th>
                <th style={{ width: 120 }}>SKU</th>
                <th style={{ width: 160 }}>Unit of Measure</th>
                <th style={{ width: 180 }}>Category</th>
                <th style={{ width: 180 }}>Item Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.external_id}>
                  <td>
                    <Checkbox
                      checked={row.checked}
                      onChange={(event) =>
                        updateRow(row.external_id, {
                          checked: event.currentTarget.checked,
                        })
                      }
                    />
                  </td>
                  <td>
                    <div>{row.name}</div>
                    {row.item_type === 'inventory-assembly' ? (
                      <div className={Classes.TEXT_MUTED}>
                        Remember to set assembly components after import.
                      </div>
                    ) : null}
                  </td>
                  <td>{row.code || '-'}</td>
                  <td>
                    <HTMLSelect
                      fill
                      value={row.unit_of_measure}
                      onChange={(event) =>
                        updateRow(row.external_id, {
                          unit_of_measure: event.currentTarget.value,
                        })
                      }
                      disabled={!row.checked}
                    >
                      {UNIT_OF_MEASURE_OPTIONS.map((option) => (
                        <option key={option.value || 'blank'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </HTMLSelect>
                  </td>
                  <td>
                    <HTMLSelect
                      fill
                      value={row.category_id}
                      onChange={(event) =>
                        updateRow(row.external_id, {
                          category_id: event.currentTarget.value,
                        })
                      }
                      disabled={!row.checked || isCategoriesLoading}
                    >
                      <option value="">Uncategorized</option>
                      {(itemsCategories || []).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </HTMLSelect>
                  </td>
                  <td>
                    <HTMLSelect
                      fill
                      value={row.item_type}
                      onChange={(event) =>
                        updateRow(row.external_id, {
                          item_type: event.currentTarget.value,
                        })
                      }
                      disabled={!row.checked}
                    >
                      {ITEM_TYPE_OPTIONS.map((option) => (
                        <option key={option.value || 'blank'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </HTMLSelect>
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={Classes.TEXT_MUTED}>
                    No new ERP products are waiting to be imported.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </HTMLTable>
        </div>
      </DialogBody>

      <DialogFooter
        actions={
          <>
            <Button onClick={onClose} disabled={isImporting}>
              <T id={'close'} />
            </Button>
            <Button
              intent={Intent.PRIMARY}
              loading={isImporting}
              onClick={handleSave}
            >
              Save Imports
            </Button>
          </>
        }
      />
    </Dialog>
  );
}
