// @ts-nocheck
import React from 'react';
import {
  Button,
  Callout,
  Classes,
  Dialog,
  DialogBody,
  DialogFooter,
  HTMLTable,
  Intent,
} from '@blueprintjs/core';
import { AppToaster, FormattedMessage as T } from '@/components';
import { useImportMatchaPopWarehouses } from '@/hooks/query';

export function WarehousesERPImportDialog({
  isOpen,
  importCandidates,
  onClose,
}) {
  const { mutateAsync: importWarehousesMutate, isLoading: isImporting } =
    useImportMatchaPopWarehouses();

  const handleImport = async () => {
    if (!importCandidates?.length) {
      AppToaster.show({
        intent: Intent.WARNING,
        message: 'No ERP warehouses are waiting to be imported.',
      });
      return;
    }

    try {
      const response = await importWarehousesMutate({
        warehouses: importCandidates.map((warehouse) => ({
          external_id: warehouse.external_id,
          name: warehouse.name,
          code: warehouse.code,
          address: warehouse.address,
          city: warehouse.city,
          country: warehouse.country,
          phone_number: warehouse.phone_number,
        })),
      });
      const result = response?.data || {};

      AppToaster.show({
        intent: Intent.SUCCESS,
        message: `${result.created_count || 0} ERP warehouses imported successfully.`,
      });

      if ((result.skipped_external_ids || []).length > 0) {
        AppToaster.show({
          intent: Intent.WARNING,
          message: `${result.skipped_external_ids.length} warehouses were skipped because they already exist.`,
        });
      }

      onClose();
    } catch (error) {
      AppToaster.show({
        intent: Intent.DANGER,
        message:
          error?.response?.data?.message || 'Failed to import ERP warehouses.',
      });
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Import ERP Warehouses"
      style={{ width: '92vw', maxWidth: 1000 }}
    >
      <DialogBody>
        <Callout intent={Intent.PRIMARY} style={{ marginBottom: '1rem' }}>
          Existing warehouses with matching `external_id` were already synced.
          The list below shows the new ERP warehouses that will be imported.
        </Callout>

        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <HTMLTable bordered interactive style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 100 }}>Code</th>
                <th>Name</th>
                <th style={{ width: 220 }}>Address</th>
                <th style={{ width: 180 }}>City</th>
                <th style={{ width: 160 }}>Phone</th>
              </tr>
            </thead>
            <tbody>
              {(importCandidates || []).map((warehouse) => (
                <tr key={warehouse.external_id}>
                  <td>{warehouse.code}</td>
                  <td>{warehouse.name}</td>
                  <td>{warehouse.address || '-'}</td>
                  <td>{warehouse.city || '-'}</td>
                  <td>{warehouse.phone_number || '-'}</td>
                </tr>
              ))}

              {!importCandidates?.length ? (
                <tr>
                  <td colSpan={5} className={Classes.TEXT_MUTED}>
                    No new ERP warehouses are waiting to be imported.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </HTMLTable>
        </div>
      </DialogBody>

      <DialogFooter
        actions={
          <>
            <Button onClick={onClose} disabled={isImporting}>
              <T id={'close'} />
            </Button>
            <Button
              intent={Intent.PRIMARY}
              loading={isImporting}
              onClick={handleImport}
            >
              Import All
            </Button>
          </>
        }
      />
    </Dialog>
  );
}
