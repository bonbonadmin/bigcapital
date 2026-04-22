// @ts-nocheck
import React from 'react';
import { Button, Intent } from '@blueprintjs/core';

import { Features } from '@/constants';
import {
  AppToaster,
  FeatureCan,
  FormattedMessage as T,
  Icon,
} from '@/components';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';
import { useSyncMatchaPopWarehouses } from '@/hooks/query';
import { WarehousesERPImportDialog } from './WarehousesERPImportDialog';

/**
 * Warehouse actions.
 */
function WarehousesActions({
  //#ownProps
  openDialog,
}) {
  const [isERPImportDialogOpen, setIsERPImportDialogOpen] = React.useState(false);
  const [erpImportCandidates, setERPImportCandidates] = React.useState([]);
  const {
    mutateAsync: syncMatchaPopWarehousesMutate,
    isLoading: isSyncingERP,
  } = useSyncMatchaPopWarehouses();

  const handleClickNewWarehouse = () => {
    openDialog('warehouse-form');
  };

  const handleCloseERPImportDialog = () => {
    setIsERPImportDialogOpen(false);
    setERPImportCandidates([]);
  };

  const handleSyncERPClick = async () => {
    try {
      const response = await syncMatchaPopWarehousesMutate();
      const result = response?.data || {};
      const updatedCount = result.updated_count || 0;
      const importCandidates = result.import_candidates || [];

      if (updatedCount > 0) {
        AppToaster.show({
          intent: Intent.SUCCESS,
          message: `${updatedCount} existing warehouses were synced from ERP.`,
        });
      }

      if (importCandidates.length > 0) {
        setERPImportCandidates(importCandidates);
        setIsERPImportDialogOpen(true);

        AppToaster.show({
          intent: Intent.PRIMARY,
          message: `${importCandidates.length} ERP warehouses are ready to import.`,
        });
        return;
      }

      if (updatedCount === 0) {
        AppToaster.show({
          intent: Intent.WARNING,
          message: 'No ERP warehouse changes were found to sync.',
        });
      }
    } catch (error) {
      AppToaster.show({
        intent: Intent.DANGER,
        message:
          error?.response?.data?.message || 'Failed to sync ERP warehouses.',
      });
    }
  };

  return (
    <React.Fragment>
      <FeatureCan feature={Features.Warehouses}>
        <>
          <Button
            icon={<Icon icon="plus" iconSize={12} />}
            onClick={handleClickNewWarehouse}
            intent={Intent.PRIMARY}
          >
            <T id={'warehouses.label.new_warehouse'} />
          </Button>
          <Button
            icon={<Icon icon="refresh-16" iconSize={12} />}
            onClick={handleSyncERPClick}
            loading={isSyncingERP}
            style={{ marginLeft: 10 }}
          >
            Sync ERP
          </Button>
          <WarehousesERPImportDialog
            isOpen={isERPImportDialogOpen}
            importCandidates={erpImportCandidates}
            onClose={handleCloseERPImportDialog}
          />
        </>
      </FeatureCan>
    </React.Fragment>
  );
}

export default compose(withDialogActions)(WarehousesActions);
