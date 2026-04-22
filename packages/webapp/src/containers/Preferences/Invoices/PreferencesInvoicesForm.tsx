// @ts-nocheck
import { Form } from 'formik';
import { Button, Intent } from '@blueprintjs/core';
import { useHistory } from 'react-router-dom';

import {
  AccountsSelect,
  CardFooterActions,
  FieldRequiredHint,
  FormattedMessage as T,
  FFormGroup,
  FTextArea,
} from '@/components';
import { ACCOUNT_TYPE } from '@/constants/accountTypes';
import { usePreferencesInvoiceFormContext } from './PreferencesInvoiceFormBoot';

/**
 * Invoices preferences form.
 */
export function PreferencesInvoicesForm({ isSubmitting }) {
  const history = useHistory();
  const { accounts } = usePreferencesInvoiceFormContext();

  // Handle close click.
  const handleCloseClick = () => {
    history.go(-1);
  };

  return (
    <Form>
      {/* ---------- Customer Notes ----------  */}
      <FFormGroup
        name={'customerNotes'}
        label={<T id={'pref.invoices.customerNotes.field'} />}
        fastField={true}
      >
        <FTextArea
          medium={'true'}
          name={'customerNotes'}
          fastField={true}
          fill={true}
        />
      </FFormGroup>

      {/* ---------- Terms & Conditions ----------  */}
      <FFormGroup
        name={'termsConditions'}
        label={<T id={'pref.invoices.termsConditions.field'} />}
        fastField={true}
      >
        <FTextArea
          medium={'true'}
          name={'termsConditions'}
          fastField={true}
          fill={true}
        />
      </FFormGroup>

      <FFormGroup
        name={'erpSalesTypesPerCustomer'}
        label={<strong>ERP Sales Types Imported Per Customer</strong>}
        helperText={
          'Enter one sales_type per line or separated by commas. Sales types listed here import to the matched ERP customer. Any sales_type not listed will import into an aggregate customer like Agg-shopee.'
        }
        fastField={true}
      >
        <FTextArea
          medium={'true'}
          name={'erpSalesTypesPerCustomer'}
          fastField={true}
          fill={true}
        />
      </FFormGroup>

      <FFormGroup
        name={'preferredReceivableAccount'}
        label={<strong>Preferred Accounts Receivable</strong>}
        helperText={
          'Choose the accounts receivable account that ERP-imported sales invoices should post to.'
        }
        labelInfo={<FieldRequiredHint />}
        fastField={true}
      >
        <AccountsSelect
          name={'preferredReceivableAccount'}
          items={accounts}
          filterByTypes={[ACCOUNT_TYPE.ACCOUNTS_RECEIVABLE]}
        />
      </FFormGroup>

      <CardFooterActions>
        <Button loading={isSubmitting} intent={Intent.PRIMARY} type="submit">
          <T id={'save'} />
        </Button>
        <Button onClick={handleCloseClick}>
          <T id={'close'} />
        </Button>
      </CardFooterActions>
    </Form>
  );
}
