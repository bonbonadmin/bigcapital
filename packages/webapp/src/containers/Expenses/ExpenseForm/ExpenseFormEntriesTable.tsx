// @ts-nocheck
import React, { useCallback } from 'react';

import { DataTableEditable } from '@/components';
import { useExpenseFormContext } from './ExpenseFormPageProvider';
import { useExpenseFormTableColumns } from './components';
import {
  saveInvoke,
  compose,
  updateTableCell,
  updateMinEntriesLines,
  updateAutoAddNewLine,
  updateRemoveLineByIndex,
} from '@/utils';

/**
 * Expenses form entries.
 */
export default function ExpenseFormEntriesTable({
  // #ownPorps
  entries,
  defaultEntry,
  error,
  onChange,
  currencyCode,
  landedCost = true,
  minLines,
  autoAddNewLine = true,
}) {
  // Expense form context.
  const { accounts, projects } = useExpenseFormContext();

  // Memorized data table columns.
  const columns = useExpenseFormTableColumns({ landedCost });

  // Handles update datatable data.
  const handleUpdateData = useCallback(
    (rowIndex, columnId, value) => {
      const transforms = [
        updateTableCell(rowIndex, columnId, value),
      ];

      if (autoAddNewLine) {
        transforms.unshift(updateAutoAddNewLine(defaultEntry, ['expense_account_id']));
      }

      const newRows = compose(...transforms)(entries);

      saveInvoke(onChange, newRows);
    },
    [entries, defaultEntry, onChange],
  );

  // Handles click remove datatable row.
  const handleRemoveRow = useCallback(
    (rowIndex) => {
      const newRows = compose(
        // Ensure minimum lines count.
        updateMinEntriesLines(minLines, defaultEntry),
        // Remove the line by the given index.
        updateRemoveLineByIndex(rowIndex),
      )(entries);

      saveInvoke(onChange, newRows);
    },
    [minLines, entries, defaultEntry, onChange],
  );

  return (
    <DataTableEditable
      name={'expense-form'}
      columns={columns}
      data={entries}
      sticky={true}
      payload={{
        accounts: accounts,
        projects: projects,
        errors: error,
        updateData: handleUpdateData,
        removeRow: handleRemoveRow,
        autoFocus: ['expense_account_id', 0],
        currencyCode,
      }}
    />
  );
}

ExpenseFormEntriesTable.defaultProps = {
  minLines: 1,
};
