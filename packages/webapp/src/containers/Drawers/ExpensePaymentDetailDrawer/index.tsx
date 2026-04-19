// @ts-nocheck
import React from 'react';
import { Drawer, DrawerSuspense } from '@/components';
import { withDrawers } from '@/containers/Drawer/withDrawers';
import { compose } from '@/utils';

const ExpensePaymentDetailContent = React.lazy(() =>
  import('./ExpensePaymentDetailContent'),
);

function ExpensePaymentDetailDrawer({
  name,
  isOpen,
  payload: { expensePaymentId },
}) {
  return (
    <Drawer
      isOpen={isOpen}
      name={name}
      size={'65%'}
      style={{ minWidth: '700px', maxWidth: '900px' }}
    >
      <DrawerSuspense>
        <ExpensePaymentDetailContent expensePaymentId={expensePaymentId} />
      </DrawerSuspense>
    </Drawer>
  );
}

export default compose(withDrawers())(ExpensePaymentDetailDrawer);
