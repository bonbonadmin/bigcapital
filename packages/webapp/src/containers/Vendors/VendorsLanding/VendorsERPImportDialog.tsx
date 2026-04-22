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
import { useImportMatchaPopVendors } from '@/hooks/query';

export function VendorsERPImportDialog({
  isOpen,
  importCandidates,
  onClose,
}) {
  const { mutateAsync: importVendorsMutate, isLoading: isImporting } =
    useImportMatchaPopVendors();

  const handleImport = async () => {
    if (!importCandidates?.length) {
      AppToaster.show({
        intent: Intent.WARNING,
        message: 'No ERP vendors are waiting to be imported.',
      });
      return;
    }

    try {
      const response = await importVendorsMutate({
        vendors: importCandidates.map((vendor) => ({
          external_id: vendor.external_id,
          company_name: vendor.company_name,
          first_name: vendor.first_name,
          last_name: vendor.last_name,
          display_name: vendor.display_name,
          work_phone: vendor.work_phone,
          email: vendor.email,
          billing_address1: vendor.billing_address1,
          billing_address_city: vendor.billing_address_city,
          billing_address_state: vendor.billing_address_state,
          billing_address_postcode: vendor.billing_address_postcode,
        })),
      });
      const result = response?.data || {};

      AppToaster.show({
        intent: Intent.SUCCESS,
        message: `${result.created_count || 0} ERP vendors imported successfully.`,
      });

      if ((result.skipped_external_ids || []).length > 0) {
        AppToaster.show({
          intent: Intent.WARNING,
          message: `${result.skipped_external_ids.length} vendors were skipped because they already exist.`,
        });
      }

      onClose();
    } catch (error) {
      AppToaster.show({
        intent: Intent.DANGER,
        message:
          error?.response?.data?.message || 'Failed to import ERP vendors.',
      });
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Import ERP Vendors"
      style={{ width: '92vw', maxWidth: 1100 }}
    >
      <DialogBody>
        <Callout intent={Intent.PRIMARY} style={{ marginBottom: '1rem' }}>
          Existing vendors with matching `external_id` were already synced. The
          list below shows the new ERP vendors that will be imported.
        </Callout>

        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <HTMLTable bordered interactive style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 100 }}>Code</th>
                <th>Display Name</th>
                <th style={{ width: 220 }}>Company Name</th>
                <th style={{ width: 180 }}>Phone</th>
                <th style={{ width: 220 }}>City</th>
              </tr>
            </thead>
            <tbody>
              {(importCandidates || []).map((vendor) => (
                <tr key={vendor.external_id}>
                  <td>{vendor.external_id}</td>
                  <td>{vendor.display_name || '-'}</td>
                  <td>{vendor.company_name || '-'}</td>
                  <td>{vendor.work_phone || '-'}</td>
                  <td>
                    {vendor.billing_address_city || (
                      <span className={Classes.TEXT_MUTED}>-</span>
                    )}
                  </td>
                </tr>
              ))}

              {!importCandidates?.length ? (
                <tr>
                  <td colSpan={5} className={Classes.TEXT_MUTED}>
                    No new ERP vendors are waiting to be imported.
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
