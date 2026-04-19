// @ts-nocheck
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  Button,
  Classes,
  Intent,
  NavbarDivider,
  NavbarGroup,
} from '@blueprintjs/core';
import { useDeleteExpensePayment } from '@/hooks/query';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import {
  Can,
  DrawerActionsBar,
  FormattedMessage as T,
  Icon,
} from '@/components';
import {
  AbilitySubject,
  PaymentMadeAction,
} from '@/constants/abilityOption';
import { compose } from '@/utils';
import { DRAWERS } from '@/constants/drawers';
import { AppToaster } from '@/components';
import { useExpensePaymentDetailContext } from './ExpensePaymentDetailProvider';

function ExpensePaymentDetailActionsBar({ closeDrawer }) {
  const history = useHistory();
  const { expensePaymentId } = useExpensePaymentDetailContext();
  const { mutateAsync: deleteExpensePaymentMutate } = useDeleteExpensePayment();

  const handleEditExpensePayment = () => {
    history.push(`/expenses/payments-made/${expensePaymentId}/edit`);
    closeDrawer(DRAWERS.EXPENSE_PAYMENT_DETAILS);
  };

  const handleDeleteExpensePayment = async () => {
    if (!window.confirm('Delete this payment?')) {
      return;
    }
    await deleteExpensePaymentMutate(expensePaymentId);
    closeDrawer(DRAWERS.EXPENSE_PAYMENT_DETAILS);
    AppToaster.show({
      message: 'The payment has been deleted successfully.',
      intent: Intent.SUCCESS,
    });
  };

  return (
    <DrawerActionsBar>
      <NavbarGroup>
        <Can I={PaymentMadeAction.Edit} a={AbilitySubject.PaymentMade}>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon="pen-18" />}
            text={<T id={'edit_payment_made'} />}
            onClick={handleEditExpensePayment}
          />
        </Can>

        <Can I={PaymentMadeAction.Delete} a={AbilitySubject.PaymentMade}>
          <NavbarDivider />
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon={'trash-16'} iconSize={16} />}
            text={<T id={'delete'} />}
            intent={Intent.DANGER}
            onClick={handleDeleteExpensePayment}
          />
        </Can>
      </NavbarGroup>
    </DrawerActionsBar>
  );
}

export default compose(withDrawerActions)(ExpensePaymentDetailActionsBar);
