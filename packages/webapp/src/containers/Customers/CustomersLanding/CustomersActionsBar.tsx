// @ts-nocheck
import React from 'react';
import {
  NavbarGroup,
  NavbarDivider,
  Button,
  Classes,
  Intent,
  Switch,
  Alignment,
} from '@blueprintjs/core';
import { useHistory } from 'react-router-dom';

import {
  Icon,
  Can,
  AppToaster,
  FormattedMessage as T,
  DashboardActionViewsList,
  AdvancedFilterPopover,
  DashboardFilterButton,
  DashboardRowsHeightButton,
  DashboardActionsBar,
} from '@/components';

import { useCustomersListContext } from './CustomersListProvider';
import {
  useRefreshCustomers,
  useSyncMatchaPopCustomers,
} from '@/hooks/query/customers';
import { useDownloadExportPdf } from '@/hooks/query/FinancialReports/use-export-pdf';

import { withCustomers } from './withCustomers';
import { withCustomersActions } from './withCustomersActions';
import { withSettingsActions } from '@/containers/Settings/withSettingsActions';
import { withSettings } from '@/containers/Settings/withSettings';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';

import { CustomerAction, AbilitySubject } from '@/constants/abilityOption';
import { compose } from '@/utils';
import { DialogsName } from '@/constants/dialogs';
import { isEmpty } from 'lodash';
import { useBulkDeleteCustomersDialog } from './hooks/use-bulk-delete-customers-dialog';
import { CustomersERPImportDialog } from './CustomersERPImportDialog';

/**
 * Customers actions bar.
 */
function CustomerActionsBar({
  // #withCustomers
  customersSelectedRows = [],
  customersFilterConditions,

  // #withCustomersActions
  setCustomersTableState,
  accountsInactiveMode,

  // #withSettings
  customersTableSize,

  // #withSettingsActions
  addSetting,

  // #withDialogActions
  openDialog,
}) {
  const { openBulkDeleteDialog, isValidatingBulkDeleteCustomers } =
    useBulkDeleteCustomersDialog();
  const [isERPImportDialogOpen, setIsERPImportDialogOpen] = React.useState(false);
  const [erpImportCandidates, setERPImportCandidates] = React.useState([]);

  // History context.
  const history = useHistory();

  // Customers list context.
  const { customersViews, fields } = useCustomersListContext();

  // Customers refresh action.
  const { refresh } = useRefreshCustomers();
  const { mutateAsync: syncMatchaPopCustomersMutate, isLoading: isSyncingERP } =
    useSyncMatchaPopCustomers();

  // Exports pdf document.
  const { downloadAsync: downloadExportPdf } = useDownloadExportPdf();

  const onClickNewCustomer = () => {
    history.push('/customers/new');
  };

  // Handle Customers bulk delete button click.,
  const handleBulkDelete = () => {
    openBulkDeleteDialog(customersSelectedRows);
  };

  const handleTabChange = (view) => {
    setCustomersTableState({
      viewSlug: view ? view.slug : null,
    });
  };
  // Handle inactive switch changing.
  const handleInactiveSwitchChange = (event) => {
    const checked = event.target.checked;
    setCustomersTableState({ inactiveMode: checked });
  };

  // Handle click a refresh customers
  const handleRefreshBtnClick = () => {
    refresh();
  };

  // Handle table row size change.
  const handleTableRowSizeChange = (size) => {
    addSetting('customers', 'tableSize', size);
  };

  // Handle import button click.
  const handleImportBtnClick = () => {
    history.push('/customers/import');
  };

  const handleCloseERPImportDialog = () => {
    setIsERPImportDialogOpen(false);
    setERPImportCandidates([]);
  };

  const handleSyncERPClick = async () => {
    try {
      const response = await syncMatchaPopCustomersMutate();
      const result = response?.data || {};
      const updatedCount = result.updated_count || 0;
      const importCandidates = result.import_candidates || [];

      if (updatedCount > 0) {
        AppToaster.show({
          intent: Intent.SUCCESS,
          message: `${updatedCount} existing customers were synced from ERP.`,
        });
      }

      if (importCandidates.length > 0) {
        setERPImportCandidates(importCandidates);
        setIsERPImportDialogOpen(true);

        AppToaster.show({
          intent: Intent.PRIMARY,
          message: `${importCandidates.length} ERP customers are ready to import.`,
        });
        return;
      }

      if (updatedCount === 0) {
        AppToaster.show({
          intent: Intent.WARNING,
          message: 'No ERP customer changes were found to sync.',
        });
      }
    } catch (error) {
      AppToaster.show({
        intent: Intent.DANGER,
        message:
          error?.response?.data?.message || 'Failed to sync ERP customers.',
      });
    }
  };

  // Handle the export button click.
  const handleExportBtnClick = () => {
    openDialog(DialogsName.Export, { resource: 'customer' });
  };
  // Handle the print button click.
  const handlePrintBtnClick = () => {
    downloadExportPdf({ resource: 'Customer' });
  };

  if (!isEmpty(customersSelectedRows)) {
    return (
      <DashboardActionsBar>
        <NavbarGroup>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon="trash-16" iconSize={16} />}
            text={<T id={'delete'} />}
            intent={Intent.DANGER}
            onClick={handleBulkDelete}
            disabled={isValidatingBulkDeleteCustomers}
          />
        </NavbarGroup>
      </DashboardActionsBar>
    );
  }

  return (
    <DashboardActionsBar>
      <NavbarGroup>
        <DashboardActionViewsList
          resourceName={'customers'}
          views={customersViews}
          allMenuItem={true}
          allMenuItemText={<T id={'all'} />}
          onChange={handleTabChange}
        />
        <NavbarDivider />
        <Can I={CustomerAction.Create} a={AbilitySubject.Customer}>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon={'plus'} />}
            text={<T id={'new_customer'} />}
            onClick={onClickNewCustomer}
          />
          <NavbarDivider />
        </Can>
        <AdvancedFilterPopover
          advancedFilterProps={{
            conditions: customersFilterConditions,
            defaultFieldKey: 'display_name',
            fields: fields,
            onFilterChange: (filterConditions) => {
              setCustomersTableState({ filterRoles: filterConditions });
            },
          }}
        >
          <DashboardFilterButton
            conditionsCount={customersFilterConditions.length}
          />
        </AdvancedFilterPopover>

        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon="print-16" iconSize={16} />}
          text={<T id={'print'} />}
          onClick={handlePrintBtnClick}
        />
        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon="file-import-16" iconSize={16} />}
          onClick={handleImportBtnClick}
          text={<T id={'import'} />}
        />
        <Can I={CustomerAction.Edit} a={AbilitySubject.Customer}>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon="refresh-16" iconSize={16} />}
            onClick={handleSyncERPClick}
            text={'Sync ERP'}
            loading={isSyncingERP}
          />
        </Can>
        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon="file-export-16" iconSize={16} />}
          text={<T id={'export'} />}
          onClick={handleExportBtnClick}
        />
        <NavbarDivider />
        <DashboardRowsHeightButton
          initialValue={customersTableSize}
          onChange={handleTableRowSizeChange}
        />
        <NavbarDivider />
        <Can I={CustomerAction.Edit} a={AbilitySubject.Customer}>
          <Switch
            labelElement={<T id={'inactive'} />}
            defaultChecked={accountsInactiveMode}
            onChange={handleInactiveSwitchChange}
          />
        </Can>
      </NavbarGroup>
      <NavbarGroup align={Alignment.RIGHT}>
        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon="refresh-16" iconSize={14} />}
          onClick={handleRefreshBtnClick}
        />
      </NavbarGroup>

      <CustomersERPImportDialog
        isOpen={isERPImportDialogOpen}
        importCandidates={erpImportCandidates}
        onClose={handleCloseERPImportDialog}
      />
    </DashboardActionsBar>
  );
}

export default compose(
  withCustomersActions,
  withSettingsActions,
  withCustomers(({ customersSelectedRows, customersTableState }) => ({
    customersSelectedRows,
    accountsInactiveMode: customersTableState.inactiveMode,
    customersFilterConditions: customersTableState.filterRoles,
  })),
  withSettings(({ customersSettings }) => ({
    customersTableSize: customersSettings?.tableSize,
  })),
  withDialogActions,
)(CustomerActionsBar);
