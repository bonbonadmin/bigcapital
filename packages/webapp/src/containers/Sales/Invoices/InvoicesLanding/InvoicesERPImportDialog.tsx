// @ts-nocheck
import React from 'react';
import moment from 'moment';
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
import { useImportMatchaPopSaleInvoices } from '@/hooks/query';

export function InvoicesERPImportDialog({
  isOpen,
  importCandidates,
  skippedOrders,
  syncMode,
  nextSyncAt,
  onClose,
}) {
  const formatOrderDate = React.useCallback((value) => {
    return value ? moment(value).format('YYYY MMM DD') : '-';
  }, []);

  const { mutateAsync: importOrdersMutate, isLoading: isImporting } =
    useImportMatchaPopSaleInvoices();

  const handleImport = async () => {
    if (!importCandidates?.length) {
      AppToaster.show({
        intent: Intent.WARNING,
        message: 'No ERP orders are waiting to be imported.',
      });
      return;
    }

    try {
      const response = await importOrdersMutate({
        orderIds: importCandidates.map((candidate) => candidate.orderId),
        mode: syncMode,
        nextSyncAt,
      });
      const result = response?.data || {};

      AppToaster.show({
        intent: Intent.SUCCESS,
        message: `${result.created_count || 0} ERP sale invoices imported successfully.`,
      });

      if ((result.skipped_orders || []).length > 0) {
        AppToaster.show({
          intent: Intent.WARNING,
          message: `${result.skipped_orders.length} ERP orders were skipped during import.`,
        });
      }

      onClose();
    } catch (error) {
      AppToaster.show({
        intent: Intent.DANGER,
        message:
          error?.response?.data?.message ||
          'Failed to import ERP sale invoices.',
      });
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Import ERP Sale Invoices"
      style={{ width: '92vw', maxWidth: 1100 }}
    >
      <DialogBody>
        <Callout intent={Intent.PRIMARY} style={{ marginBottom: '1rem' }}>
          Existing ERP-linked invoices were already synced. The list below shows
          new ERP orders that can be imported as sale invoices.
        </Callout>

        {skippedOrders?.length ? (
          <Callout intent={Intent.WARNING} style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              {skippedOrders.length} ERP orders were skipped.
            </div>
            <div style={{ maxHeight: '12rem', overflow: 'auto' }}>
              {(skippedOrders || []).map((skippedOrder) => (
                <div key={`${skippedOrder.orderId}-${skippedOrder.reason}`}>
                  Order #{skippedOrder.orderId}: {skippedOrder.reason}
                </div>
              ))}
            </div>
          </Callout>
        ) : null}

        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <HTMLTable bordered interactive style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 100 }}>Order #</th>
                <th style={{ width: 120 }}>Date</th>
                <th style={{ width: 140 }}>Sales Type</th>
                <th>Customer</th>
                <th style={{ width: 120 }}>Items</th>
                <th style={{ width: 160 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(importCandidates || []).map((order) => (
                <tr key={order.orderId}>
                  <td>{order.invoiceNo}</td>
                  <td>{formatOrderDate(order.orderDate)}</td>
                  <td>{order.salesType || '-'}</td>
                  <td>{order.customerName || '-'}</td>
                  <td>{order.itemCount || 0}</td>
                  <td>{order.total || 0}</td>
                </tr>
              ))}

              {!importCandidates?.length ? (
                <tr>
                  <td colSpan={6} className={Classes.TEXT_MUTED}>
                    No new ERP orders are waiting to be imported.
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
