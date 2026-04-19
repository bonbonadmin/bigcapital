// @ts-nocheck
import React from 'react';
import moment from 'moment';
import { useHistory } from 'react-router-dom';
import {
  Alignment,
  Button,
  Classes,
  Intent,
  Menu,
  MenuDivider,
  MenuItem,
  NavbarGroup,
  Popover,
  Position,
} from '@blueprintjs/core';

import '@/style/pages/PaymentMade/List.scss';

import {
  AppToaster,
  Can,
  DashboardActionsBar,
  DashboardContentTable,
  DashboardPageContent,
  DataTable,
  FormattedMessage as T,
  Icon,
  Money,
  TableSkeletonHeader,
  TableSkeletonRows,
} from '@/components';
import { compose } from '@/utils';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useDeleteExpensePayment, useDeletePaymentMade } from '@/hooks/query';
import {
  useExpensePayments,
  useRefreshExpensePayments,
} from '@/hooks/query/expensePayments';
import {
  usePaymentMades,
  useRefreshPaymentMades,
} from '@/hooks/query/paymentMades';
import { DRAWERS } from '@/constants/drawers';
import { PaymentMadeAction, AbilitySubject } from '@/constants/abilityOption';
import { TABLES } from '@/constants/tables';
import { useMemorizedColumnsWidths } from '@/hooks';
import PaymentMadesEmptyStatus from './PaymentMadesEmptyStatus';

function normalizeBillPayment(payment) {
  return {
    ...payment,
    paymentSource: 'bill',
    paymentSourceLabel: 'Bill',
  };
}

function normalizeExpensePayment(payment) {
  return {
    ...payment,
    paymentSource: 'expense',
    paymentSourceLabel: 'Expense',
  };
}

function AmountCell({ value, row: { original } }) {
  return <Money amount={value} currency={original.currency_code} />;
}

function DateCell({ value }) {
  return value ? moment(value).format('YYYY MMM DD') : '-';
}

function ActionsMenu({
  row: { original },
  payload: { onViewDetails, onEdit, onDelete },
}) {
  return (
    <Menu>
      <MenuItem
        icon={<Icon icon="reader-18" />}
        text="View details"
        onClick={() => onViewDetails(original)}
      />
      <MenuDivider />
      <MenuItem
        icon={<Icon icon="pen-18" />}
        text="Edit payment"
        onClick={() => onEdit(original)}
      />
      <MenuDivider />
      <MenuItem
        text="Delete payment"
        intent={Intent.DANGER}
        onClick={() => onDelete(original)}
        icon={<Icon icon="trash-16" iconSize={16} />}
      />
    </Menu>
  );
}

export function CombinedPaymentMadeList({ openDrawer }) {
  const history = useHistory();

  const {
    data: { paymentMades },
    isLoading: isBillPaymentsLoading,
    isFetching: isBillPaymentsFetching,
  } = usePaymentMades({ page_size: 1000 }, { keepPreviousData: true });
  const {
    data: { expensePayments },
    isLoading: isExpensePaymentsLoading,
    isFetching: isExpensePaymentsFetching,
  } = useExpensePayments({ page_size: 1000 }, { keepPreviousData: true });

  const { mutateAsync: deletePaymentMadeMutate } = useDeletePaymentMade();
  const { mutateAsync: deleteExpensePaymentMutate } =
    useDeleteExpensePayment();
  const { refresh: refreshBillPayments } = useRefreshPaymentMades();
  const { refresh: refreshExpensePayments } = useRefreshExpensePayments();

  const payments = React.useMemo(() => {
    const normalized = [
      ...(paymentMades || []).map(normalizeBillPayment),
      ...(expensePayments || []).map(normalizeExpensePayment),
    ];

    return normalized.sort((a, b) => {
      const aDate = new Date(a.payment_date || a.created_at || 0).getTime();
      const bDate = new Date(b.payment_date || b.created_at || 0).getTime();
      return bDate - aDate;
    });
  }, [expensePayments, paymentMades]);

  const columns = React.useMemo(
    () => [
      {
        id: 'payment_source',
        Header: 'Type',
        accessor: 'paymentSourceLabel',
        width: 100,
      },
      {
        id: 'payment_date',
        Header: 'Payment Date',
        accessor: 'payment_date',
        Cell: DateCell,
        width: 140,
      },
      {
        id: 'vendor',
        Header: 'Vendor',
        accessor: 'vendor.display_name',
        width: 180,
      },
      {
        id: 'payment_number',
        Header: 'Payment Number',
        accessor: (row) => row.payment_number || null,
        width: 140,
      },
      {
        id: 'payment_account',
        Header: 'Payment Account',
        accessor: 'payment_account.name',
        width: 180,
      },
      {
        id: 'amount',
        Header: 'Amount',
        accessor: 'amount',
        Cell: AmountCell,
        width: 140,
        align: 'right',
        money: true,
      },
      {
        id: 'reference',
        Header: 'Reference',
        accessor: 'reference',
        width: 140,
      },
    ],
    [],
  );

  const [initialColumnsWidths, , handleColumnResizing] =
    useMemorizedColumnsWidths(TABLES.PAYMENT_MADES);

  const isLoading = isBillPaymentsLoading || isExpensePaymentsLoading;
  const isFetching = isBillPaymentsFetching || isExpensePaymentsFetching;

  const handleRefresh = () => {
    refreshBillPayments();
    refreshExpensePayments();
  };

  const handleViewDetails = (payment) => {
    if (payment.paymentSource === 'expense') {
      openDrawer(DRAWERS.EXPENSE_PAYMENT_DETAILS, {
        expensePaymentId: payment.id,
      });
      return;
    }
    openDrawer(DRAWERS.PAYMENT_MADE_DETAILS, {
      paymentMadeId: payment.id,
    });
  };

  const handleEdit = (payment) => {
    if (payment.paymentSource === 'expense') {
      history.push(`/expenses/payments-made/${payment.id}/edit`);
      return;
    }
    history.push(`/payments-made/${payment.id}/edit`);
  };

  const handleDelete = async (payment) => {
    if (!window.confirm('Delete this payment?')) {
      return;
    }

    if (payment.paymentSource === 'expense') {
      await deleteExpensePaymentMutate(payment.id);
    } else {
      await deletePaymentMadeMutate(payment.id);
    }

    AppToaster.show({
      message: 'The payment has been deleted successfully.',
      intent: Intent.SUCCESS,
    });
  };

  if (!isLoading && payments.length === 0) {
    return <PaymentMadesEmptyStatus createPath="/payment-list/payments-made/new" />;
  }

  return (
    <>
      <DashboardActionsBar>
        <NavbarGroup>
          <Can I={PaymentMadeAction.Create} a={AbilitySubject.PaymentMade}>
            <Button
              className={Classes.MINIMAL}
              icon={<Icon icon={'plus'} />}
              text={<T id={'new_payment_made'} />}
              onClick={() => history.push('/payment-list/payments-made/new')}
            />
          </Can>
        </NavbarGroup>
        <NavbarGroup align={Alignment.RIGHT}>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon="refresh-16" iconSize={14} />}
            onClick={handleRefresh}
          />
        </NavbarGroup>
      </DashboardActionsBar>

      <DashboardPageContent>
        <DashboardContentTable>
          <DataTable
            columns={columns}
            data={payments}
            loading={isLoading}
            headerLoading={isLoading}
            progressBarLoading={isFetching}
            manualSortBy={false}
            manualPagination={false}
            sticky={true}
            pagination={true}
            initialPageSize={20}
            autoResetSortBy={false}
            autoResetPage={false}
            TableLoadingRenderer={TableSkeletonRows}
            TableHeaderSkeletonRenderer={TableSkeletonHeader}
            ContextMenu={ActionsMenu}
            onCellClick={(cell) => handleViewDetails(cell.row.original)}
            initialColumnsWidths={initialColumnsWidths}
            onColumnResizing={handleColumnResizing}
            payload={{
              onViewDetails: handleViewDetails,
              onEdit: handleEdit,
              onDelete: handleDelete,
            }}
          />
        </DashboardContentTable>
      </DashboardPageContent>
    </>
  );
}

export default compose(withDrawerActions)(CombinedPaymentMadeList);
