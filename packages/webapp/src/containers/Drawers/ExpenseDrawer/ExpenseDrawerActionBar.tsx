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
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';

import { compose } from '@/utils';
import { DRAWERS } from '@/constants/drawers';
import { DialogsName } from '@/constants/dialogs';

/**
 * Expense drawer action bar.
 */
function ExpenseDrawerActionBar({
  // #withAlertsDialog
  openAlert,

  // #withDialogActions
  openDialog,

  // #withDrawerActions
  closeDrawer,
}) {
  const history = useHistory();

  // Expense drawer context.
  const { expense } = useExpenseDrawerContext();
  const dueAmount = Number(expense?.due_amount ?? expense?.dueAmount) || 0;

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
          {expense.is_open && dueAmount > 0 && (
            <>
              <NavbarDivider />
              <Button
                className={Classes.MINIMAL}
                icon={<Icon icon="arrow-upward" iconSize={16} />}
                text={<T id={'add_payment'} />}
                onClick={() =>
                  openDialog(DialogsName.QuickPaymentMadeForm, {
                    expenseId: expense.id,
                  })
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
  withDialogActions,
  withDrawerActions,
)(ExpenseDrawerActionBar);
