// @ts-nocheck
import React from 'react';
import { useFormikContext } from 'formik';
import styled from 'styled-components';
import {
  FSelect,
  TotalLines,
  TotalLine,
  TotalLineBorderStyle,
  TotalLineTextStyle,
} from '@/components';
import {
  useExpenseSubtotalFormatted,
  useExpenseTotalFormatted,
  useExpenseSalesTaxAmountFormatted,
  useExpenseWithholdingTaxAmountFormatted,
} from './utils';
import { useExpenseFormContext } from './ExpenseFormPageProvider';

export function ExpenseFormFooterRight() {
  const { taxRates, withholdingTaxes } = useExpenseFormContext();
  const {
    values: { expense_mode },
  } = useFormikContext();
  const totalFormatted = useExpenseTotalFormatted();
  const subtotalFormatted = useExpenseSubtotalFormatted();
  const salesTaxAmountFormatted = useExpenseSalesTaxAmountFormatted();
  const withholdingTaxAmountFormatted = useExpenseWithholdingTaxAmountFormatted();
  const salesTaxOptions = React.useMemo(
    () => [
      {
        id: '',
        name_formatted: 'No sales tax',
      },
      ...taxRates.filter((taxRate) => taxRate.account_id),
    ],
    [taxRates],
  );
  const withholdingTaxOptions = React.useMemo(
    () => [
      {
        id: '',
        name_formatted: 'No withholding tax',
      },
      ...withholdingTaxes,
    ],
    [withholdingTaxes],
  );

  return (
    <ExpensesTotalLines>
      <TotalLine
        title={'Subtotal'}
        value={subtotalFormatted}
        borderStyle={TotalLineBorderStyle.None}
      />
      <TotalLine
        title={
          <WithholdingTaxLineTitle>
            <span>Withholding Tax</span>
            <WithholdingTaxSelect
              name={'withholding_tax_id'}
              items={withholdingTaxOptions}
              valueAccessor={'id'}
              textAccessor={'name_formatted'}
              labelAccessor={'name_formatted'}
              placeholder={'Select withholding tax'}
              fill={true}
            />
          </WithholdingTaxLineTitle>
        }
        value={withholdingTaxAmountFormatted}
        borderStyle={TotalLineBorderStyle.None}
      />
      <TotalLine
        title={
          <WithholdingTaxLineTitle>
            <span>Sales Tax</span>
            <WithholdingTaxSelect
              name={'sales_tax_rate_id'}
              items={salesTaxOptions}
              valueAccessor={'id'}
              textAccessor={'name_formatted'}
              labelAccessor={'name_formatted'}
              placeholder={'Select sales tax'}
              fill={true}
            />
          </WithholdingTaxLineTitle>
        }
        value={salesTaxAmountFormatted}
        borderStyle={TotalLineBorderStyle.None}
      />
      <TotalLine
        title={'Total'}
        value={totalFormatted}
        textStyle={TotalLineTextStyle.Bold}
      />
    </ExpensesTotalLines>
  );
}

const ExpensesTotalLines = styled(TotalLines)`
  --x-color-text: #555555;

  .bp4-dark & {
    --x-color-text: var(--color-light-gray4);
  }
  width: 100%;
  color: var(--x-color-text);
`;

const WithholdingTaxLineTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const WithholdingTaxSelect = styled(FSelect)`
  min-width: 220px;
`;
