// @ts-nocheck
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  Button,
  Classes,
  NavbarGroup,
  Intent,
  NavbarDivider,
} from '@blueprintjs/core';
import {
  Icon,
  DrawerActionsBar,
  Can,
  FormattedMessage as T,
} from '@/components';
import {
  ExpenseAction,
  PaymentMadeAction,
  AbilitySubject,
} from '@/constants/abilityOption';
import { useExpenseDrawerContext } from './ExpenseDrawerProvider';

import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';

import { compose } from '@/utils';
import { DRAWERS } from '@/constants/drawers';

/**
 * Expense drawer action bar.
 */
function ExpenseDrawerActionBar({
  // #withAlertsDialog
  openAlert,

  // #withDrawerActions
  closeDrawer,
}) {
  const history = useHistory();

  // Expense drawer context.
  const { expense } = useExpenseDrawerContext();

  // Handle the expense edit action.
  const handleEditExpense = () => {
    history.push(`/expenses/${expense.id}/edit`);
    closeDrawer(DRAWERS.EXPENSE_DETAILS);
  };

  // Handle the expense delete action.
  const handleDeleteExpense = () => {
    openAlert('expense-delete', { expenseId: expense.id });
  };

  return (
    <DrawerActionsBar>
      <NavbarGroup>
        <Can I={ExpenseAction.Edit} a={AbilitySubject.Expense}>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon="pen-18" />}
            text={<T id={'edit_expense'} />}
            onClick={handleEditExpense}
          />
        </Can>
        <Can I={PaymentMadeAction.Create} a={AbilitySubject.PaymentMade}>
          {expense.is_open && !expense.is_fully_paid && (
            <>
              <NavbarDivider />
              <Button
                className={Classes.MINIMAL}
                icon={<Icon icon="arrow-upward" iconSize={16} />}
                text={<T id={'add_payment'} />}
                onClick={() =>
                  history.push(`/expenses/payments-made/new?expense_id=${expense.id}`)
                }
              />
            </>
          )}
        </Can>
        <Can I={ExpenseAction.Delete} a={AbilitySubject.Expense}>
          <NavbarDivider />
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon="trash-16" iconSize={16} />}
            text={<T id={'delete'} />}
            intent={Intent.DANGER}
            onClick={handleDeleteExpense}
          />
        </Can>
      </NavbarGroup>
    </DrawerActionsBar>
  );
}

export default compose(
  withAlertActions,
  withDrawerActions,
)(ExpenseDrawerActionBar);
