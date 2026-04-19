// @ts-nocheck
import React from 'react';
import {
  Button,
  Classes,
  Intent,
  Menu,
  MenuDivider,
  MenuItem,
  NavbarDivider,
  NavbarGroup,
} from '@blueprintjs/core';
import {
  Can,
  DashboardActionsBar,
  DashboardContentTable,
  DashboardPageContent,
  DataTable,
  Icon,
  TableSkeletonHeader,
  TableSkeletonRows,
} from '@/components';
import { Align } from '@/constants';
import { AbilitySubject, TaxRateAction } from '@/constants/abilityOption';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { DialogsName } from '@/constants/dialogs';
import { useWithholdingTaxes } from '@/hooks/query/withholdingTaxes';
import { compose, safeCallback } from '@/utils';

function WithholdingTaxesLanding({ openDialog, openAlert }) {
  const {
    data: withholdingTaxes,
    isLoading: isWithholdingTaxesLoading,
  } = useWithholdingTaxes();

  const columns = React.useMemo(
    () => [
      {
        Header: 'Name',
        accessor: 'name',
        width: 50,
      },
      {
        Header: 'Rate',
        accessor: 'rate_formatted',
        align: Align.Right,
        width: 20,
      },
      {
        Header: 'Account',
        accessor: 'account_name',
        width: 45,
      },
      {
        Header: 'Description',
        accessor: (row) => (
          <span className={Classes.TEXT_MUTED}>{row.description}</span>
        ),
        width: 80,
      },
    ],
    [],
  );

  const handleCreate = () => {
    openDialog(DialogsName.WithholdingTaxForm);
  };
  const handleEdit = (withholdingTax) => {
    openDialog(DialogsName.WithholdingTaxForm, {
      id: withholdingTax.id,
    });
  };
  const handleDelete = (withholdingTax) => {
    openAlert('withholding-tax-delete', {
      withholdingTaxId: withholdingTax.id,
    });
  };

  return (
    <>
      <DashboardActionsBar>
        <NavbarGroup>
          <Can I={TaxRateAction.Create} a={AbilitySubject.TaxRate}>
            <Button
              className={Classes.MINIMAL}
              icon={<Icon icon="plus" />}
              text={'New Withholding Tax'}
              onClick={handleCreate}
            />
          </Can>
          <NavbarDivider />
        </NavbarGroup>
      </DashboardActionsBar>

      <DashboardPageContent>
        <DashboardContentTable>
          <DataTable
            columns={columns}
            data={withholdingTaxes}
            loading={isWithholdingTaxesLoading}
            headerLoading={isWithholdingTaxesLoading}
            progressBarLoading={isWithholdingTaxesLoading}
            manualSortBy={false}
            selectionColumn={false}
            sticky={true}
            pagination={false}
            manualPagination={false}
            autoResetSortBy={false}
            autoResetPage={false}
            TableLoadingRenderer={TableSkeletonRows}
            TableHeaderSkeletonRenderer={TableSkeletonHeader}
            ContextMenu={WithholdingTaxesActionsMenu}
            size={'medium'}
            payload={{
              onEdit: handleEdit,
              onDelete: handleDelete,
            }}
          />
        </DashboardContentTable>
      </DashboardPageContent>
    </>
  );
}

function WithholdingTaxesActionsMenu({
  payload: { onEdit, onDelete },
  row: { original },
}) {
  return (
    <Menu>
      <Can I={TaxRateAction.Edit} a={AbilitySubject.TaxRate}>
        <MenuItem
          icon={<Icon icon="pen-18" />}
          text={'Edit Withholding Tax'}
          onClick={safeCallback(onEdit, original)}
        />
      </Can>
      <Can I={TaxRateAction.Delete} a={AbilitySubject.TaxRate}>
        <MenuDivider />
        <MenuItem
          intent={Intent.DANGER}
          icon={<Icon icon="trash-16" iconSize={16} />}
          text={'Delete Withholding Tax'}
          onClick={safeCallback(onDelete, original)}
        />
      </Can>
    </Menu>
  );
}

export default compose(withDialogActions, withAlertActions)(
  WithholdingTaxesLanding,
);
