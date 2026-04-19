// @ts-nocheck
import React, { lazy } from 'react';
import styled from 'styled-components';
import { Dialog, DialogSuspense } from '@/components';
import withDialogRedux from '@/components/DialogReduxConnect';
import { compose } from '@/utils';

const WithholdingTaxFormDialogContent = lazy(
  () => import('./WithholdingTaxFormDialogContent'),
);

function WithholdingTaxFormDialog({
  dialogName,
  payload = { id: null },
  isOpen,
}) {
  return (
    <WithholdingTaxDialog
      name={dialogName}
      title={payload.id ? 'Edit Withholding Tax' : 'Create Withholding Tax'}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
    >
      <DialogSuspense>
        <WithholdingTaxFormDialogContent
          dialogName={dialogName}
          withholdingTaxId={payload.id}
        />
      </DialogSuspense>
    </WithholdingTaxDialog>
  );
}

const WithholdingTaxDialog = styled(Dialog)`
  max-width: 520px;
`;

export default compose(withDialogRedux())(WithholdingTaxFormDialog);
