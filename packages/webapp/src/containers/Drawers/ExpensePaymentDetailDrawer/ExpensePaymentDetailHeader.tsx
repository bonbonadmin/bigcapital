// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { defaultTo } from 'lodash';
import {
  Col,
  CommercialDocHeader,
  CommercialDocTopHeader,
  DetailItem,
  DetailsMenu,
  ExchangeRateDetailItem,
  Row,
  VendorDrawerLink,
} from '@/components';
import { useExpensePaymentDetailContext } from './ExpensePaymentDetailProvider';

export default function ExpensePaymentDetailHeader() {
  const { expensePayment } = useExpensePaymentDetailContext();

  return (
    <CommercialDocHeader>
      <CommercialDocTopHeader>
        <DetailsMenu>
          <DetailItem label={intl.get('amount')}>
            <h3 class="big-number">{expensePayment.formatted_amount}</h3>
          </DetailItem>
        </DetailsMenu>
      </CommercialDocTopHeader>

      <Row>
        <Col xs={6}>
          <DetailsMenu direction={'horizantal'} minLabelSize={'180px'}>
            <DetailItem
              label={intl.get('payment_date')}
              children={expensePayment.formatted_payment_date}
            />
            <DetailItem
              label={intl.get('payment_made.details.payment_number')}
              children={defaultTo(expensePayment.payment_number, '-')}
            />
            <DetailItem label={intl.get('vendor_name')}>
              <VendorDrawerLink vendorId={expensePayment.vendor_id}>
                {expensePayment.vendor?.display_name}
              </VendorDrawerLink>
            </DetailItem>
            <DetailItem
              label={intl.get('payment_account')}
              children={expensePayment.payment_account?.name}
            />
            <ExchangeRateDetailItem
              exchangeRate={expensePayment?.exchange_rate}
              toCurrency={expensePayment?.currency_code}
            />
          </DetailsMenu>
        </Col>

        <Col xs={6}>
          <DetailsMenu
            textAlign={'right'}
            direction={'horizantal'}
            minLabelSize={'180px'}
          >
            <DetailItem
              label={intl.get('reference')}
              children={defaultTo(expensePayment.reference, '-')}
            />
            <DetailItem
              label={intl.get('created_at')}
              children={expensePayment.formatted_created_at}
            />
          </DetailsMenu>
        </Col>
      </Row>
    </CommercialDocHeader>
  );
}
