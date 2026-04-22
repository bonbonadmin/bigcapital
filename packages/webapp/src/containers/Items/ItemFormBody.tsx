// @ts-nocheck
import React from 'react';
import { useFormikContext, FastField, ErrorMessage } from 'formik';
import { FormGroup, Classes, Checkbox, ControlGroup } from '@blueprintjs/core';
import {
  AccountsSelect,
  MoneyInputGroup,
  FMoneyInputGroup,
  Col,
  Row,
  Hint,
  InputPrependText,
  FFormGroup,
  FTextArea,
} from '@/components';
import { FormattedMessage as T } from '@/components';

import { useItemFormContext } from './ItemFormProvider';
import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';
import { ACCOUNT_PARENT_TYPE } from '@/constants/accountTypes';
import {
  sellDescriptionFieldShouldUpdate,
  sellAccountFieldShouldUpdate,
  sellPriceFieldShouldUpdate,
  costPriceFieldShouldUpdate,
  costAccountFieldShouldUpdate,
  purchaseDescFieldShouldUpdate,
  taxRateFieldShouldUpdate,
} from './utils';
import { compose, inputIntent } from '@/utils';
import { TaxRatesSelect } from '@/components/TaxRates/TaxRatesSelect';

/**
 * Item form body.
 */
function ItemFormBody({ organization: { base_currency } }) {
  const { accounts, taxRates } = useItemFormContext();
  const { values, setFieldValue } = useFormikContext();
  const isAssembly = values.type === 'inventory-assembly';

  React.useEffect(() => {
    if (isAssembly) {
      if (values.purchasable) {
        setFieldValue('purchasable', false);
      }
      if (!values.sellable) {
        setFieldValue('sellable', true);
      }
    }
  }, [isAssembly, values.purchasable, values.sellable, setFieldValue]);

  return (
    <div class="page-form__section page-form__section--selling-cost">
      <Row>
        <Col xs={6}>
          {/*------------- Purchasable checbox ------------- */}
          <FastField name={'sellable'} type="checkbox">
            {({ form, field }) => (
              <FormGroup inline={true} className={'form-group--sellable'}>
                <Checkbox
                  inline={true}
                  label={
                    <h3>
                      <T id={'i_sell_this_item'} />
                    </h3>
                  }
                  name={'sellable'}
                  disabled={isAssembly}
                  {...field}
                />
              </FormGroup>
            )}
          </FastField>

          {/*------------- Selling price ------------- */}
          <FFormGroup
            name={'sell_price'}
            label={<T id={'selling_price'} />}
            inline
            fastField
          >
            <ControlGroup>
              <InputPrependText text={base_currency} />
              <FMoneyInputGroup
                name={'sell_price'}
                shouldUpdate={sellPriceFieldShouldUpdate}
                sellable={values.sellable}
                inputGroupProps={{ fill: true }}
                disabled={!values.sellable}
                fastField
              />
            </ControlGroup>
          </FFormGroup>

          {/*------------- Selling account ------------- */}
          <FFormGroup
            label={<T id={'account'} />}
            name={'sell_account_id'}
            labelInfo={
              <Hint content={<T id={'item.field.sell_account.hint'} />} />
            }
            inline={true}
            items={accounts}
            sellable={values.sellable}
            shouldUpdate={sellAccountFieldShouldUpdate}
            fastField={true}
          >
            <AccountsSelect
              name={'sell_account_id'}
              items={accounts}
              placeholder={<T id={'select_account'} />}
              disabled={!values.sellable}
              filterByParentTypes={[ACCOUNT_PARENT_TYPE.INCOME]}
              fill={true}
              allowCreate={true}
              fastField={true}
            />
          </FFormGroup>

          {/*------------- Sell Tax Rate ------------- */}
          <FFormGroup
            name={'sell_tax_rate_id'}
            label={'Tax Rate'}
            inline={true}
          >
            <TaxRatesSelect
              name={'sell_tax_rate_id'}
              items={taxRates}
              allowCreate
            />
          </FFormGroup>

          <FFormGroup
            name={'sell_description'}
            label={<T id={'description'} />}
            inline={true}
            sellable={values.sellable}
            shouldUpdate={sellDescriptionFieldShouldUpdate}
            fastField
          >
            <FTextArea
              name={'sell_description'}
              growVertically={true}
              height={280}
              disabled={!values.sellable}
              fill
              fastField
            />
          </FFormGroup>
        </Col>

        <Col xs={6}>
          {/*------------- Sellable checkbox ------------- */}
          <FastField name={'purchasable'} type={'checkbox'}>
            {({ field }) => (
              <FormGroup inline={true} className={'form-group--purchasable'}>
                <Checkbox
                  inline={true}
                  label={
                    <h3>
                      <T id={'i_purchase_this_item'} />
                    </h3>
                  }
                  disabled={isAssembly}
                  {...field}
                />
              </FormGroup>
            )}
          </FastField>

          {/*------------- Cost price ------------- */}
          <FFormGroup
            name={'cost_price'}
            label={<T id={'cost_price'} />}
            inline
            fastField
          >
            <ControlGroup>
              <InputPrependText text={base_currency} />

              <FMoneyInputGroup
                name={'cost_price'}
                shouldUpdate={costPriceFieldShouldUpdate}
                purchasable={values.purchasable}
                inputGroupProps={{ medium: true }}
                disabled={!values.purchasable || isAssembly}
                fastField
              />
            </ControlGroup>
          </FFormGroup>

          {/*------------- Cost account ------------- */}
          <FFormGroup
            name={'cost_account_id'}
            purchasable={values.purchasable || isAssembly}
            items={accounts}
            shouldUpdate={costAccountFieldShouldUpdate}
            label={<T id={'account'} />}
            labelInfo={
              <Hint content={<T id={'item.field.cost_account.hint'} />} />
            }
            inline={true}
            fastField={true}
          >
            <AccountsSelect
              name={'cost_account_id'}
              items={accounts}
              placeholder={<T id={'select_account'} />}
              filterByParentTypes={[ACCOUNT_PARENT_TYPE.EXPENSE]}
              popoverFill={true}
              allowCreate={true}
              fastField={true}
              disabled={!values.purchasable && !isAssembly}
              purchasable={values.purchasable || isAssembly}
              shouldUpdate={costAccountFieldShouldUpdate}
            />
          </FFormGroup>

          {/*------------- Purchase Tax Rate ------------- */}
          <FFormGroup
            name={'purchase_tax_rate_id'}
            label={'Tax Rate'}
            inline={true}
            fastField={true}
            shouldUpdateDeps={{ taxRates }}
            shouldUpdate={taxRateFieldShouldUpdate}
          >
            <TaxRatesSelect
              name={'purchase_tax_rate_id'}
              items={taxRates}
              allowCreate={true}
              fastField={true}
              shouldUpdateDeps={{ taxRates }}
              disabled={isAssembly}
            />
          </FFormGroup>

          <FFormGroup
            name={'purchase_description'}
            label={<T id={'description'} />}
            className={'form-group--purchase-description'}
            helperText={<ErrorMessage name={'description'} />}
            inline={true}
            purchasable={values.purchasable}
            shouldUpdate={purchaseDescFieldShouldUpdate}
          >
            <FTextArea
              name={'purchase_description'}
              growVertically={true}
              height={280}
              disabled={!values.purchasable || isAssembly}
              fill
            />
          </FFormGroup>
        </Col>
      </Row>

      {isAssembly ? (
        <p className={'bp4-text-muted'} style={{ marginTop: '0.75rem' }}>
          <T id={'assembly_item_purchase_hint'} />
        </p>
      ) : null}
    </div>
  );
}

export default compose(withCurrentOrganization())(ItemFormBody);
