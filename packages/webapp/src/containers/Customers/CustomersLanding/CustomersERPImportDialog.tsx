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
import { useImportMatchaPopCustomers } from '@/hooks/query';

export function CustomersERPImportDialog({
  isOpen,
  importCandidates,
  onClose,
}) {
  const { mutateAsync: importCustomersMutate, isLoading: isImporting } =
    useImportMatchaPopCustomers();

  const handleImport = async () => {
    if (!importCandidates?.length) {
      AppToaster.show({
        intent: Intent.WARNING,
        message: 'No ERP customers are waiting to be imported.',
      });
      return;
    }

    try {
      const response = await importCustomersMutate({
        customers: importCandidates.map((customer) => ({
          external_id: customer.external_id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          display_name: customer.display_name,
          work_phone: customer.work_phone,
          email: customer.email,
          billing_address_city: customer.billing_address_city,
          billing_address_state: customer.billing_address_state,
        })),
      });
      const result = response?.data || {};

      AppToaster.show({
        intent: Intent.SUCCESS,
        message: `${result.created_count || 0} ERP customers imported successfully.`,
      });

      if ((result.skipped_external_ids || []).length > 0) {
        AppToaster.show({
          intent: Intent.WARNING,
          message: `${result.skipped_external_ids.length} customers were skipped because they already exist.`,
        });
      }

      onClose();
    } catch (error) {
      AppToaster.show({
        intent: Intent.DANGER,
        message:
          error?.response?.data?.message ||
          'Failed to import ERP customers.',
      });
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Import ERP Customers"
      style={{ width: '92vw', maxWidth: 1000 }}
    >
      <DialogBody>
        <Callout intent={Intent.PRIMARY} style={{ marginBottom: '1rem' }}>
          Existing customers with matching `external_id` were already synced.
          The list below shows the new ERP customers that will be imported.
        </Callout>

        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <HTMLTable bordered interactive style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 100 }}>Code</th>
                <th>Name</th>
                <th style={{ width: 180 }}>Phone</th>
                <th style={{ width: 240 }}>Email</th>
                <th style={{ width: 180 }}>City</th>
              </tr>
            </thead>
            <tbody>
              {(importCandidates || []).map((customer) => (
                <tr key={customer.external_id}>
                  <td>{customer.external_id}</td>
                  <td>{customer.display_name || '-'}</td>
                  <td>{customer.work_phone || '-'}</td>
                  <td>{customer.email || '-'}</td>
                  <td>
                    {customer.billing_address_city || (
                      <span className={Classes.TEXT_MUTED}>-</span>
                    )}
                  </td>
                </tr>
              ))}

              {!importCandidates?.length ? (
                <tr>
                  <td colSpan={5} className={Classes.TEXT_MUTED}>
                    No new ERP customers are waiting to be imported.
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
