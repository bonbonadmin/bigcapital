// @ts-nocheck
import React from 'react';
import { Classes, Intent, Tag } from '@blueprintjs/core';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import styled from 'styled-components';
import {
  AccountsSelect,
  AppToaster,
  DialogContent,
  FFormGroup,
  FInputGroup,
  FTextArea,
  FieldRequiredHint,
  FormattedMessage as T,
} from '@/components';
import { ACCOUNT_ROOT_TYPE } from '@/constants/accountTypes';
import { useAccounts } from '@/hooks/query/accounts';
import {
  useCreateWithholdingTax,
  useEditWithholdingTax,
  useWithholdingTax,
} from '@/hooks/query/withholdingTaxes';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

const Schema = Yup.object().shape({
  name: Yup.string().trim().required().label('Name'),
  rate: Yup.number().min(0).max(100).required().label('Rate'),
  description: Yup.string().nullable(),
  account_id: Yup.number().required().label('Account'),
});

const defaultValues = {
  name: '',
  rate: '',
  description: '',
  account_id: '',
};

function WithholdingTaxFormDialogContent({
  dialogName,
  withholdingTaxId,
  closeDialog,
}) {
  const isNewMode = !withholdingTaxId;
  const { data: withholdingTax, isLoading: isWithholdingTaxLoading } =
    useWithholdingTax(withholdingTaxId, {
      enabled: !!withholdingTaxId,
    });
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();
  const { mutateAsync: createWithholdingTaxMutate } = useCreateWithholdingTax();
  const { mutateAsync: editWithholdingTaxMutate } = useEditWithholdingTax();

  const initialValues = React.useMemo(
    () =>
      withholdingTax
        ? {
            name: withholdingTax.name,
            rate: withholdingTax.rate,
            description: withholdingTax.description || '',
            account_id:
              withholdingTax.account_id || withholdingTax.accountId || '',
          }
        : defaultValues,
    [withholdingTax],
  );

  const handleSubmit = (values, { setSubmitting, setErrors }) => {
    const form = {
      name: values.name,
      rate: Number(values.rate),
      description: values.description,
      account_id: values.account_id,
    };

    const handleSuccess = () => {
      AppToaster.show({
        message: isNewMode
          ? 'The withholding tax has been created successfully.'
          : 'The withholding tax has been updated successfully.',
        intent: Intent.SUCCESS,
      });
      closeDialog(dialogName);
    };
    const handleError = (error) => {
      setSubmitting(false);
      setErrors(error?.response?.data?.errors || {});
      AppToaster.show({
        message: 'Something went wrong.',
        intent: Intent.DANGER,
      });
    };

    const action = isNewMode
      ? createWithholdingTaxMutate(form)
      : editWithholdingTaxMutate([withholdingTaxId, form]);

    action.then(handleSuccess).catch(handleError);
  };

  return (
    <DialogContent isLoading={isWithholdingTaxLoading || isAccountsLoading}>
      <Formik
        initialValues={initialValues}
        validationSchema={Schema}
        onSubmit={handleSubmit}
        enableReinitialize={true}
      >
        <Form>
          <div className={Classes.DIALOG_BODY}>
            <FFormGroup
              name={'name'}
              label={'Name'}
              labelInfo={<FieldRequiredHint />}
              fastField={true}
            >
              <FInputGroup name={'name'} fastField={true} />
            </FFormGroup>

            <FFormGroup
              name={'rate'}
              label={'Rate (%)'}
              labelInfo={<FieldRequiredHint />}
              fastField={true}
            >
              <RateInput
                name={'rate'}
                rightElement={<Tag minimal>%</Tag>}
                fastField={true}
              />
            </FFormGroup>

            <FFormGroup
              name={'description'}
              label={'Description'}
              fastField={true}
            >
              <FTextArea name={'description'} rows={3} fastField={true} />
            </FFormGroup>

            <FFormGroup
              name={'account_id'}
              label={'Account'}
              labelInfo={<FieldRequiredHint />}
              items={accounts}
              fastField={true}
            >
              <AccountsSelect
                name={'account_id'}
                items={accounts}
                filterByRootTypes={[
                  ACCOUNT_ROOT_TYPE.ASSET,
                  ACCOUNT_ROOT_TYPE.LIABILITY,
                ]}
                placeholder={'Select withholding account'}
                allowCreate={true}
                fastField={true}
              />
            </FFormGroup>
          </div>

          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <button
                type="button"
                className="bp4-button"
                onClick={() => closeDialog(dialogName)}
              >
                <T id={'cancel'} />
              </button>
              <button type="submit" className="bp4-button bp4-intent-primary">
                {isNewMode ? 'Create Withholding Tax' : 'Save'}
              </button>
            </div>
          </div>
        </Form>
      </Formik>
    </DialogContent>
  );
}

const RateInput = styled(FInputGroup)`
  max-width: 120px;
`;

export default compose(withDialogActions)(WithholdingTaxFormDialogContent);
