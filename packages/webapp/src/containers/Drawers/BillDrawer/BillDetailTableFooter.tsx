// @ts-nocheck
import styled from 'styled-components';
import {
  TotalLineBorderStyle,
  TotalLineTextStyle,
  T,
  TotalLines,
  TotalLine,
  Money,
} from '@/components';
import { useBillDrawerContext } from './BillDrawerProvider';

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
 * Bill read-only details table footer.
 */
export function BillDetailTableFooter() {
  const { bill } = useBillDrawerContext();
  const dueAmount = getBillDueAmount(bill);
  const overPaymentAmount = getBillOverPaymentAmount(bill);

  return (
    <BillDetailsFooterRoot>
      <BillTotalLines labelColWidth={'180px'} amountColWidth={'180px'}>
        <TotalLine
          title={<T id={'bill.details.subtotal'} />}
          value={bill.subtotal_formatted}
          borderStyle={TotalLineBorderStyle.SingleDark}
        />
        {bill.taxes.map((taxRate) => (
          <TotalLine
            key={taxRate.id}
            title={`${taxRate.name} [${taxRate.tax_rate}%]`}
            value={taxRate.tax_rate_amount_formatted}
            textStyle={TotalLineTextStyle.Regular}
          />
        ))}
        {bill.discount_amount > 0 && (
          <TotalLine
            title={
              bill.discount_percentage_formatted
                ? `Discount [${bill.discount_percentage_formatted}]`
                : 'Discount'
            }
            value={bill.discount_amount_formatted}
            textStyle={TotalLineTextStyle.Regular}
          />
        )}
        {bill.adjustment_formatted && (
          <TotalLine
            title={'Adjustment'}
            value={bill.adjustment_formatted}
          />
        )}
        <TotalLine
          title={<T id={'bill.details.total'} />}
          value={bill.total_formatted}
          borderStyle={TotalLineBorderStyle.DoubleDark}
          textStyle={TotalLineTextStyle.Bold}
        />
        <TotalLine
          title={<T id={'bill.details.payment_amount'} />}
          value={bill.formatted_payment_amount}
        />
        <TotalLine
          title={
            <T
              id={
                bill.is_over_paid
                  ? 'over_payment_amount'
                  : 'bill.details.due_amount'
              }
            />
          }
          value={
            <Money
              amount={bill.is_over_paid ? overPaymentAmount : dueAmount}
              currency={bill.currency_code}
            />
          }
          textStyle={TotalLineTextStyle.Bold}
        />
      </BillTotalLines>
    </BillDetailsFooterRoot>
  );
}

export const BillDetailsFooterRoot = styled.div``;

export const BillTotalLines = styled(TotalLines)`
  margin-left: auto;
`;
