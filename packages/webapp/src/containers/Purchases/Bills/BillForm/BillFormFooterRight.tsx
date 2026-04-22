// @ts-nocheck
import styled from 'styled-components';
import { useFormikContext } from 'formik';
import {
  FSelect,
  TotalLines,
  TotalLine,
  TotalLineBorderStyle,
  TotalLineTextStyle,
} from '@/components';
import {
  useBillAdjustmentAmountFormatted,
  useBillAggregatedTaxRates,
  useBillDiscountAmountFormatted,
  useBillDueAmountFormatted,
  useBillPaidAmountFormatted,
  useBillSalesTaxAmountFormatted,
  useBillSubtotalFormatted,
  useBillTotalFormatted,
  useBillWithholdingTaxAmountFormatted,
} from './utils';
import { TaxType } from '@/interfaces/TaxRates';
import { AdjustmentTotalLine } from '@/containers/Sales/Invoices/InvoiceForm/AdjustmentTotalLine';
import { DiscountTotalLine } from '@/containers/Sales/Invoices/InvoiceForm/DiscountTotalLine';
import { useBillFormContext } from './BillFormProvider';

export function BillFormFooterRight() {
  const {
    values: { inclusive_exclusive_tax, currency_code },
  } = useFormikContext();
  const { taxRates, withholdingTaxes } = useBillFormContext();

  const dueAmountFormatted = useBillDueAmountFormatted();
  const paidAmountFormatted = useBillPaidAmountFormatted();
  const subtotalFormatted = useBillSubtotalFormatted();
  const totalFormatted = useBillTotalFormatted();
  const salesTaxAmountFormatted = useBillSalesTaxAmountFormatted();
  const withholdingTaxAmountFormatted = useBillWithholdingTaxAmountFormatted();
  const taxEntries = useBillAggregatedTaxRates();
  const discountAmount = useBillDiscountAmountFormatted();
  const adjustmentAmount = useBillAdjustmentAmountFormatted();
  const salesTaxOptions = [
    {
      id: '',
      name_formatted: 'No sales tax',
    },
    ...taxRates.filter((taxRate) => taxRate.account_id),
  ];
  const withholdingTaxOptions = [
    {
      id: '',
      name_formatted: 'No withholding tax',
    },
    ...withholdingTaxes,
  ];

  return (
    <BillTotalLines labelColWidth={'180px'} amountColWidth={'180px'}>
      <TotalLine
        title={
          <>
            {inclusive_exclusive_tax === TaxType.Inclusive
              ? 'Subtotal (Tax Inclusive)'
              : 'Subtotal'}
          </>
        }
        value={subtotalFormatted}
      />
      <DiscountTotalLine
        currencyCode={currency_code}
        discountAmount={discountAmount}
      />
      <AdjustmentTotalLine adjustmentAmount={adjustmentAmount} />
      <TotalLine
        title={
          <SalesTaxLineTitle>
            <span>Sales Tax</span>
            <SalesTaxSelect
              name={'sales_tax_rate_id'}
              items={salesTaxOptions}
              valueAccessor={'id'}
              textAccessor={'name_formatted'}
              labelAccessor={'name_formatted'}
              placeholder={'Select sales tax'}
              fill={true}
            />
          </SalesTaxLineTitle>
        }
        value={salesTaxAmountFormatted}
        borderStyle={TotalLineBorderStyle.None}
      />
      <TotalLine
        title={
          <SalesTaxLineTitle>
            <span>Withholding Tax</span>
            <SalesTaxSelect
              name={'withholding_tax_id'}
              items={withholdingTaxOptions}
              valueAccessor={'id'}
              textAccessor={'name_formatted'}
              labelAccessor={'name_formatted'}
              placeholder={'Select withholding tax'}
              fill={true}
            />
          </SalesTaxLineTitle>
        }
        value={withholdingTaxAmountFormatted}
        borderStyle={TotalLineBorderStyle.None}
      />
      {taxEntries.map((tax, index) => (
        <TotalLine
          key={index}
          title={tax.label}
          value={tax.taxAmountFormatted}
          borderStyle={TotalLineBorderStyle.None}
        />
      ))}
      <TotalLine
        title={`TOTAL (${currency_code})`}
        value={totalFormatted}
        borderStyle={TotalLineBorderStyle.SingleDark}
        textStyle={TotalLineTextStyle.Bold}
      />
      <TotalLine
        title={'Paid Amount'}
        value={paidAmountFormatted}
        borderStyle={TotalLineBorderStyle.None}
      />
      <TotalLine
        title={'Due Amount'}
        value={dueAmountFormatted}
        textStyle={TotalLineTextStyle.Bold}
      />
    </BillTotalLines>
  );
}

const BillTotalLines = styled(TotalLines)`
  --x-color-text: #555;
  --x-color-text: var(--color-light-gray4);

  width: 100%;
  color: var(--x-color-text);
`;

const SalesTaxLineTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SalesTaxSelect = styled(FSelect)`
  min-width: 220px;
`;
