// @ts-nocheck
import React from 'react';
import { Alert, Intent } from '@blueprintjs/core';
import { AppToaster, FormattedMessage as T } from '@/components';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useDeleteWithholdingTax } from '@/hooks/query/withholdingTaxes';
import { compose } from '@/utils';

function WithholdingTaxDeleteAlert({
  name,
  isOpen,
  payload: { withholdingTaxId },
  closeAlert,
}) {
  const { mutateAsync: deleteWithholdingTax, isLoading } =
    useDeleteWithholdingTax();

  const handleCancel = () => {
    closeAlert(name);
  };
  const handleConfirm = () => {
    deleteWithholdingTax(withholdingTaxId)
      .then(() => {
        AppToaster.show({
          message: 'The withholding tax has been deleted successfully.',
          intent: Intent.SUCCESS,
        });
      })
      .catch(() => {
        AppToaster.show({
          message: 'Something went wrong.',
          intent: Intent.DANGER,
        });
      })
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <Alert
      cancelButtonText={<T id={'cancel'} />}
      confirmButtonText={<T id={'delete'} />}
      icon="trash"
      intent={Intent.DANGER}
      isOpen={isOpen}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
      loading={isLoading}
    >
      <p>Once deleted, this withholding tax cannot be restored.</p>
      <p>Are you sure you want to continue?</p>
    </Alert>
  );
}

export default compose(withAlertStoreConnect(), withAlertActions)(
  WithholdingTaxDeleteAlert,
);
