// @ts-nocheck
import React, { useCallback } from 'react';
import moment from 'moment';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Button, Intent, Menu, MenuItem, MenuDivider } from '@blueprintjs/core';
import {
  DashboardContentTable,
  DataTable,
  Icon,
  Money,
  TableSkeletonHeader,
  TableSkeletonRows,
} from '@/components';
import { TABLES } from '@/constants/tables';
import { useMemorizedColumnsWidths } from '@/hooks';
import { AppToaster } from '@/components';
import { useDeleteExpensePayment } from '@/hooks/query';
import { useExpensePaymentsListContext } from './ExpensePaymentsListProvider';

function AmountAccessor(row) {
  return <Money amount={row.amount} currency={row.currency_code} />;
}

function DateAccessor(row) {
  return row.payment_date ? moment(row.payment_date).format('YYYY MMM DD') : '-';
}

function ActionsMenu({
  row: { original },
  payload: { onEdit, onDelete },
}) {
  return (
    <Menu>
      <MenuItem
        icon={<Icon icon="pen-18" />}
        text={intl.get('edit_payment_made')}
        onClick={() => onEdit(original)}
      />
      <MenuDivider />
      <MenuItem
        text={intl.get('delete_payment_made')}
        intent={Intent.DANGER}
        onClick={() => onDelete(original)}
        icon={<Icon icon="trash-16" iconSize={16} />}
      />
    </Menu>
  );
}

export default function ExpensePaymentsTable({ tableState, setTableState }) {
  const history = useHistory();
  const {
    expensePayments,
    pagination,
    isPaymentsLoading,
    isPaymentsFetching,
  } = useExpensePaymentsListContext();
  const { mutateAsync: deleteExpensePaymentMutate } = useDeleteExpensePayment();

  const columns = React.useMemo(
    () => [
      {
        id: 'payment_date',
        Header: intl.get('payment_date'),
        accessor: DateAccessor,
        width: 140,
        clickable: true,
      },
      {
        id: 'vendor',
        Header: intl.get('vendor_name'),
        accessor: 'vendor.display_name',
        width: 160,
        clickable: true,
      },
      {
        id: 'payment_number',
        Header: intl.get('payment_number'),
        accessor: 'payment_number',
        width: 140,
        clickable: true,
      },
      {
        id: 'payment_account',
        Header: intl.get('payment_account'),
        accessor: 'payment_account.name',
        width: 160,
        clickable: true,
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        accessor: AmountAccessor,
        width: 140,
        align: 'right',
        money: true,
        clickable: true,
      },
      {
        id: 'reference',
        Header: intl.get('reference'),
        accessor: 'reference',
        width: 140,
        clickable: true,
      },
    ],
    [],
  );

  const [initialColumnsWidths, , handleColumnResizing] =
    useMemorizedColumnsWidths(TABLES.PAYMENT_MADES);

  const handleFetchData = useCallback(
    ({ pageIndex, pageSize, sortBy }) => {
      setTableState((prev) => ({ ...prev, pageIndex, pageSize, sortBy }));
    },
    [setTableState],
  );

  const handleEdit = (payment) => {
    history.push(`/expenses/payments-made/${payment.id}/edit`);
  };

  const handleDelete = async (payment) => {
    if (!window.confirm('Delete this payment?')) {
      return;
    }
    await deleteExpensePaymentMutate(payment.id);
    AppToaster.show({
      message: 'The payment has been deleted successfully.',
      intent: Intent.SUCCESS,
    });
  };

  return (
    <DashboardContentTable>
      <DataTable
        columns={columns}
        data={expensePayments}
        onFetchData={handleFetchData}
        loading={isPaymentsLoading}
        headerLoading={isPaymentsLoading}
        progressBarLoading={isPaymentsFetching}
        manualSortBy={true}
        noInitialFetch={true}
        sticky={true}
        pagination={true}
        initialPageSize={tableState.pageSize}
        pagesCount={pagination.pagesCount}
        autoResetSortBy={false}
        autoResetPage={false}
        TableLoadingRenderer={TableSkeletonRows}
        TableHeaderSkeletonRenderer={TableSkeletonHeader}
        ContextMenu={ActionsMenu}
        onCellClick={(cell) => handleEdit(cell.row.original)}
        initialColumnsWidths={initialColumnsWidths}
        onColumnResizing={handleColumnResizing}
        payload={{
          onEdit: handleEdit,
          onDelete: handleDelete,
        }}
      />
    </DashboardContentTable>
  );
}
