// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import styled from 'styled-components';
import { defaultTo } from 'lodash';

import {
  FormatDate,
  DetailsMenu,
  DetailItem,
  Row,
  Col,
  CommercialDocHeader,
  CommercialDocTopHeader,
  VendorDrawerLink,
  ExchangeRateDetailItem,
  Money,
} from '@/components';

import { useBillDrawerContext } from './BillDrawerProvider';
import { BillDetailsStatus } from './utils';

const getBillBalance = (bill) => {
  const paymentAmount = Number(bill.payment_amount) || 0;
  const creditedAmount = Number(bill.credited_amount) || 0;

  return paymentAmount + creditedAmount;
};

const getBillDueAmount = (bill) => {
  const totalAmount = Number(bill.total) || 0;

  return Math.max(totalAmount - getBillBalance(bill), 0);
};

const getBillOverPaymentAmount = (bill) => {
  const totalAmount = Number(bill.total) || 0;

  return Math.max(getBillBalance(bill) - totalAmount, 0);
};

/**
 * Bill detail header.
 */
export default function BillDetailHeader() {
  const { bill } = useBillDrawerContext();
  const dueAmount = getBillDueAmount(bill);
  const overPaymentAmount = getBillOverPaymentAmount(bill);

  return (
    <CommercialDocHeader>
      <CommercialDocTopHeader>
        <DetailsMenu>
          <AmountDetailItem label={intl.get('amount')}>
            <h3 class="big-number">{bill.total_formatted}</h3>
          </AmountDetailItem>
          <StatusDetailItem>
            <BillDetailsStatus bill={bill} />
          </StatusDetailItem>
        </DetailsMenu>
      </CommercialDocTopHeader>
      <Row>
        <Col xs={6}>
          <DetailsMenu direction={'horizantal'} minLabelSize={'180px'}>
            <DetailItem label={intl.get('bill_date')}>
              {bill.formatted_bill_date}
            </DetailItem>

            <DetailItem label={intl.get('due_date')}>
              {bill.formatted_due_date}
            </DetailItem>

            <DetailItem label={intl.get('vendor_name')}>
              <VendorDrawerLink vendorId={bill.vendor_id}>
                {bill.vendor?.display_name}
              </VendorDrawerLink>
            </DetailItem>

            <DetailItem label={intl.get('bill.details.bill_number')}>
              {defaultTo(bill.bill_number, '-')}
            </DetailItem>

            <ExchangeRateDetailItem
              exchangeRate={bill?.exchange_rate}
              toCurrency={bill?.currency_code}
            />
          </DetailsMenu>
        </Col>
        <Col xs={6}>
          <DetailsMenu
            direction={'horizantal'}
            minLabelSize={'140px'}
            textAlign={'right'}
          >
            <DetailItem
              label={intl.get(
                bill.is_over_paid ? 'over_payment_amount' : 'due_amount',
              )}
            >
              <strong>
                <Money
                  amount={bill.is_over_paid ? overPaymentAmount : dueAmount}
                  currency={bill.currency_code}
                />
              </strong>
            </DetailItem>
            <DetailItem
              label={intl.get('reference')}
              children={defaultTo(bill.reference_no, '--')}
            />
            <DetailItem
              label={intl.get('bill.details.created_at')}
              children={bill.formatted_created_at}
            />
          </DetailsMenu>
        </Col>
      </Row>
    </CommercialDocHeader>
  );
}

const StatusDetailItem = styled(DetailItem)`
  width: 50%;
  text-align: right;
  position: relative;
  top: -5px;
`;

const AmountDetailItem = styled(DetailItem)`
  width: 50%;
`;
