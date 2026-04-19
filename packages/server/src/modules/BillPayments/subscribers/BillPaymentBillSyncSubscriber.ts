import {
  IBillPaymentEventCreatedPayload,
  IBillPaymentEventDeletedPayload,
  IBillPaymentEventEditedPayload,
} from '../types/BillPayments.types';
import { BillPaymentBillSync } from '../commands/BillPaymentBillSync.service';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { events } from '@/common/events/events';

@Injectable()
export class BillPaymentBillSyncSubscriber {
  /**
   * @param {BillPaymentBillSync} billPaymentBillSync - Bill payment bill sync service.
   */
  constructor(private readonly billPaymentBillSync: BillPaymentBillSync) { }

  /**
   * Handle bill increment/decrement payment amount
   * once created, edited or deleted.
   */
  @OnEvent(events.billPayment.onCreated)
  async handleBillIncrementPaymentOnceCreated({
    billPayment,
    billPaymentDTO,
    trx,
  }: IBillPaymentEventCreatedPayload) {
    await this.billPaymentBillSync.saveChangeBillsPaymentAmount(
      (billPaymentDTO.entries || []).map((entry) => ({
        billId: entry.billId,
        paymentAmount: entry.paymentAmount,
      })),
      null,
      trx,
    );
  }

  /**
   * Handle bill increment/decrement payment amount once edited.
   */
  @OnEvent(events.billPayment.onEdited)
  async handleBillIncrementPaymentOnceEdited({
    billPayment,
    billPaymentDTO,
    oldBillPayment,
    trx,
  }: IBillPaymentEventEditedPayload) {
    const oldEntries = oldBillPayment?.entries || null;

    await this.billPaymentBillSync.saveChangeBillsPaymentAmount(
      (billPaymentDTO.entries || []).map((entry) => ({
        billId: entry.billId,
        paymentAmount: entry.paymentAmount,
      })),
      oldEntries,
      trx,
    );
  }

  /**
   * Handle revert bills payment amount once bill payment deleted.
   */
  @OnEvent(events.billPayment.onDeleted)
  async handleBillDecrementPaymentAmount({
    oldBillPayment,
    trx,
  }: IBillPaymentEventDeletedPayload) {
    const oldEntries = oldBillPayment.entries || [];

    await this.billPaymentBillSync.saveChangeBillsPaymentAmount(
      oldEntries.map((entry) => ({
        billId: entry.billId,
        paymentAmount: 0,
      })),
      oldEntries,
      trx,
    );
  }
}
