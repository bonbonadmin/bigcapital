// @ts-nocheck
import React, { useCallback } from 'react';
import classNames from 'classnames';
import {
  CloudLoadingIndicator,
  DataTableEditable,
} from '@/components';
import { CLASSES } from '@/constants/classes';
import { useFormikContext } from 'formik';
import { compose, updateTableCell } from '@/utils';
import { useExpensePaymentEntriesTableColumns } from './components';
import { useExpensePaymentFormContext } from './utils';

export default function ExpensePaymentEntriesTable({
  entries,
  onUpdateData,
}) {
  const columns = useExpensePaymentEntriesTableColumns();
  const {
    values: { vendor_id },
    errors,
  } = useFormikContext();
  const { isNewEntriesFetching } = useExpensePaymentFormContext();

  const handleUpdateData = useCallback(
    (rowIndex, columnId, value) => {
      const newRows = compose(updateTableCell(rowIndex, columnId, value))(
        entries,
      );
      onUpdateData(newRows);
    },
    [entries, onUpdateData],
  );

  const noResultsMessage = vendor_id
    ? 'There are no payable expenses for this vendor.'
    : 'Select a vendor to display all open expenses.';

  return (
    <CloudLoadingIndicator isLoading={isNewEntriesFetching}>
      <DataTableEditable
        progressBarLoading={isNewEntriesFetching}
        className={classNames(CLASSES.DATATABLE_EDITOR_ITEMS_ENTRIES)}
        columns={columns}
        data={entries}
        spinnerProps={false}
        payload={{
          errors: errors?.entries || [],
          updateData: handleUpdateData,
        }}
        noResults={noResultsMessage}
      />
    </CloudLoadingIndicator>
  );
}
