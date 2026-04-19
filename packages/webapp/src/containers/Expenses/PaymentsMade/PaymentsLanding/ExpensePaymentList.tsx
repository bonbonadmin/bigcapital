// @ts-nocheck
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  Button,
  Classes,
  NavbarGroup,
  Alignment,
} from '@blueprintjs/core';

import '@/style/pages/PaymentMade/List.scss';

import {
  DashboardActionsBar,
  DashboardPageContent,
  FormattedMessage as T,
  Icon,
} from '@/components';
import { transformTableStateToQuery } from '@/utils';
import { useRefreshExpensePayments } from '@/hooks/query';
import { ExpensePaymentsListProvider } from './ExpensePaymentsListProvider';
import ExpensePaymentsTable from './ExpensePaymentsTable';

export default function ExpensePaymentList() {
  const history = useHistory();
  const { refresh } = useRefreshExpensePayments();
  const [tableState, setTableState] = React.useState({
    pageIndex: 0,
    pageSize: 20,
    sortBy: [{ id: 'created_at', desc: true }],
  });

  return (
    <ExpensePaymentsListProvider query={transformTableStateToQuery(tableState)}>
      <DashboardActionsBar>
        <NavbarGroup>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon={'plus'} />}
            text={<T id={'new_payment_made'} />}
            onClick={() => history.push('/expenses/payments-made/new')}
          />
        </NavbarGroup>
        <NavbarGroup align={Alignment.RIGHT}>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon="refresh-16" iconSize={14} />}
            onClick={refresh}
          />
        </NavbarGroup>
      </DashboardActionsBar>

      <DashboardPageContent>
        <ExpensePaymentsTable tableState={tableState} setTableState={setTableState} />
      </DashboardPageContent>
    </ExpensePaymentsListProvider>
  );
}
