// @ts-nocheck
import React from 'react';
import { FormGroup, Position, Classes } from '@blueprintjs/core';
import { DateInput } from '@blueprintjs/datetime';
import { useFormikContext } from 'formik';
import { FastField, ErrorMessage } from 'formik';
import { css } from '@emotion/css';
import classNames from 'classnames';
import { useTheme } from '@emotion/react';
import styled from 'styled-components';

import {
  FInputGroup,
  Stack,
  FormattedMessage as T,
  VendorDrawerLink,
  VendorsSelect,
} from '@/components';
import {
  momentFormatter,
  tansformDateValue,
  inputIntent,
  handleDateChange,
} from '@/utils';
import { vendorsFieldShouldUpdate, accountsFieldShouldUpdate } from './utils';
import {
  FFormGroup,
  FSelect,
  AccountsSelect,
  FieldRequiredHint,
  Hint,
} from '@/components';
import { ExpensesExchangeRateInputField } from './components';
import { useExpenseFormContext } from './ExpenseFormPageProvider';
import {
  EXPENSE_FORM_MODE,
  SUPPORTED_EXPENSE_PAYABLE_ACCOUNT_TYPES,
  SUPPORTED_EXPENSE_PAYMENT_ACCOUNT_TYPES,
} from './constants';

const getFieldsStyle = (theme: Theme) => css`
  .${theme.bpPrefix}-form-group {
    margin-bottom: 0;

    &.${theme.bpPrefix}-inline {
      max-width: 450px;
    }
    .${theme.bpPrefix}-label {
      min-width: 150px;
      font-weight: 500;
    }
    .${theme.bpPrefix}-form-content {
      width: 100%;
    }
  }
`;

/**
 * Expense form header.
 */
export default function ExpenseFormHeader() {
  const { currencies, accounts, expenseMode } = useExpenseFormContext();
  const theme = useTheme();
  const fieldsClassName = getFieldsStyle(theme);

  return (
    <Stack spacing={18} flex={1} className={fieldsClassName}>
      <FastField name={'payment_date'}>
        {({ form, field: { value }, meta: { error, touched } }) => (
          <FormGroup
            label={<T id={'payment_date'} />}
            labelInfo={<Hint />}
            className={classNames('form-group--select-list', Classes.FILL)}
            intent={inputIntent({ error, touched })}
            helperText={<ErrorMessage name="payment_date" />}
            inline={true}
          >
            <DateInput
              {...momentFormatter('YYYY/MM/DD')}
              value={tansformDateValue(value)}
              onChange={handleDateChange((formattedDate) => {
                form.setFieldValue('payment_date', formattedDate);
              })}
              popoverProps={{ position: Position.BOTTOM, minimal: true }}
            />
          </FormGroup>
        )}
      </FastField>

      {expenseMode === EXPENSE_FORM_MODE.PAID ? (
        <FFormGroup
          name={'payment_account_id'}
          items={accounts}
          label={<T id={'payment_account'} />}
          labelInfo={<FieldRequiredHint />}
          inline={true}
          fastField={true}
          shouldUpdate={accountsFieldShouldUpdate}
        >
          <AccountsSelect
            name={'payment_account_id'}
            items={accounts}
            placeholder={<T id={'select_payment_account'} />}
            filterByTypes={SUPPORTED_EXPENSE_PAYMENT_ACCOUNT_TYPES}
            allowCreate={true}
            fastField={true}
            shouldUpdate={accountsFieldShouldUpdate}
            fill={true}
          />
        </FFormGroup>
      ) : (
        <FFormGroup
          name={'payable_account_id'}
          items={accounts}
          label={<T id={'payable_account'} />}
          labelInfo={<FieldRequiredHint />}
          inline={true}
          fastField={true}
          shouldUpdate={accountsFieldShouldUpdate}
        >
          <AccountsSelect
            name={'payable_account_id'}
            items={accounts}
            placeholder={<T id={'select_payable_account'} />}
            filterByTypes={SUPPORTED_EXPENSE_PAYABLE_ACCOUNT_TYPES}
            allowCreate={true}
            fastField={true}
            shouldUpdate={accountsFieldShouldUpdate}
            fill={true}
          />
        </FFormGroup>
      )}

      <FFormGroup
        name={'currency_code'}
        label={<T id={'currency'} />}
        className={classNames(Classes.FILL)}
        inline={true}
        fastField={true}
      >
        <FSelect
          name={'currency_code'}
          items={currencies}
          valueAccessor={'currency_code'}
          textAccessor={'currency_code'}
          labelAccessor={'currency_code'}
          popoverProps={{ minimal: true }}
          fill={true}
          fastField={true}
        />
      </FFormGroup>

      {/* ----------- Exchange rate ----------- */}
      <ExpensesExchangeRateInputField
        name={'exchange_rate'}
        formGroupProps={{ label: ' ', inline: true }}
      />

      {/* ----------- Reference No. ----------- */}
      <FFormGroup
        name={'reference_no'}
        label={<T id={'reference_no'} />}
        inline={true}
        fastField
      >
        <FInputGroup minimal={true} name={'reference_no'} fastField />
      </FFormGroup>

      {/* ----------- Vendor ----------- */}
      {expenseMode === EXPENSE_FORM_MODE.PAYABLE && <ExpenseFormVendorSelect />}
    </Stack>
  );
}

/**
 * Vendor select field of expense form.
 * @returns {React.ReactNode}
 */
function ExpenseFormVendorSelect() {
  const { values, setFieldValue } = useFormikContext();
  const { vendors } = useExpenseFormContext();

  return (
    <FFormGroup
      name={'payee_id'}
      label={<T id={'vendor_name'} />}
      labelInfo={<Hint />}
      inline
      fastField={true}
      shouldUpdateDeps={{ items: vendors }}
      shouldUpdate={vendorsFieldShouldUpdate}
    >
      <VendorsSelect
        name={'payee_id'}
        items={vendors}
        placeholder={<T id={'select_vender_account'} />}
        onItemChange={(vendor) => {
          setFieldValue('payee_id', vendor.id);
        }}
        allowCreate={true}
        popoverFill={true}
        fastField={true}
        shouldUpdateDeps={{ items: vendors }}
        shouldUpdate={vendorsFieldShouldUpdate}
      />
      {values.payee_id && (
        <VendorButtonLink vendorId={values.payee_id}>
          <T id={'view_vendor_details'} />
        </VendorButtonLink>
      )}
    </FFormGroup>
  );
}

const VendorButtonLink = styled(VendorDrawerLink)`
  font-size: 11px;
  margin-top: 6px;
`;
