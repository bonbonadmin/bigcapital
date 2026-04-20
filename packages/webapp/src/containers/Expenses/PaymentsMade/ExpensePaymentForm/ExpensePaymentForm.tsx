// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import { css } from '@emotion/css';
import intl from 'react-intl-universal';
import { useHistory, useLocation } from 'react-router-dom';
import { Formik, Form, FastField, useFormikContext } from 'formik';
import {
  Intent,
  Position,
  Button,
  NavbarGroup,
  Classes,
  FormGroup,
} from '@blueprintjs/core';
import { ErrorMessage } from 'formik';
import { DateInput } from '@blueprintjs/datetime';
import { useTheme, Theme } from '@emotion/react';
import { x } from '@xstyled/emotion';
import classNames from 'classnames';

import {
  AppToaster,
  Box,
  BranchSelect,
  DetailsBarSkeletonBase,
  FEditableText,
  FFormGroup,
  FInputGroup,
  FieldRequiredHint,
  FeatureCan,
  FormBranchSelectButton,
  FormTopbar,
  FormattedMessage as T,
  Money,
  PageForm,
  PageFormBigNumber,
  Paper,
  Row,
  Col,
  Stack,
  TotalLine,
  TotalLineTextStyle,
  TotalLines,
  VendorDrawerLink,
  VendorsSelect,
  AccountsSelect,
} from '@/components';
import { Features } from '@/constants';
import { ACCOUNT_TYPE } from '@/constants/accountTypes';
import { useFeatureCan } from '@/hooks/state';
import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';
import { withSettings } from '@/containers/Settings/withSettings';
import { compose, momentFormatter, tansformDateValue, handleDateChange, inputIntent, safeSumBy } from '@/utils';

import { useExpensePaymentFormContext, useSetPrimaryBranchToForm, useExpensePaymentTotals, transformErrors, transformFormToRequest, transformToEditForm, transformToNewPageEntries, defaultExpensePayment, vendorsFieldShouldUpdate, accountsFieldShouldUpdate } from './utils';
import { CreateExpensePaymentFormSchema, EditExpensePaymentFormSchema } from './ExpensePaymentForm.schema';
import { ExpensePaymentExchangeRateInputField } from './components';
import ExpensePaymentEntriesTable from './ExpensePaymentEntriesTable';
import { useExpensePaymentNewPageEntries } from '@/hooks/query';

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

function ExpensePaymentTopBar() {
  const { featureCan } = useFeatureCan();
  const { branches } = useExpensePaymentFormContext();
  useSetPrimaryBranchToForm();

  if (!featureCan(Features.Branches)) {
    return null;
  }

  return (
    <FormTopbar>
      <NavbarGroup>
        <FeatureCan feature={Features.Branches}>
          {branches ? (
            <BranchSelect
              name={'branch_id'}
              branches={branches}
              input={FormBranchSelectButton}
              popoverProps={{ minimal: true }}
              fill={false}
            />
          ) : (
            <DetailsBarSkeletonBase className={Classes.SKELETON} />
          )}
        </FeatureCan>
      </NavbarGroup>
    </FormTopbar>
  );
}

function ExpensePaymentHeaderFields() {
  const {
    values: { vendor_id, payment_date },
    setFieldValue,
  } = useFormikContext();
  const { vendors, accounts, isNewMode } = useExpensePaymentFormContext();
  const theme = useTheme();
  const fieldsClassName = getFieldsStyle(theme);

  return (
    <Stack spacing={18} flex={1} className={fieldsClassName}>
      <FFormGroup
        name={'vendor_id'}
        label={<T id={'vendor_name'} />}
        labelInfo={<FieldRequiredHint />}
        inline={true}
        fastField={true}
        shouldUpdate={vendorsFieldShouldUpdate}
        shouldUpdateDeps={{ items: vendors }}
      >
        <VendorsSelect
          name={'vendor_id'}
          items={vendors}
          placeholder={<T id={'select_vender_account'} />}
          onItemChange={(contact) => {
            setFieldValue('vendor_id', contact.id);
            setFieldValue('currency_code', contact?.currency_code);
          }}
          disabled={!isNewMode}
          allowCreate={true}
          fastField={true}
          shouldUpdate={vendorsFieldShouldUpdate}
          shouldUpdateDeps={{ items: vendors }}
        />
        {vendor_id && (
          <VendorButtonLink vendorId={vendor_id}>
            <T id={'view_vendor_details'} />
          </VendorButtonLink>
        )}
      </FFormGroup>

      <ExpensePaymentExchangeRateInputField
        name={'exchange_rate'}
        formGroupProps={{ label: ' ', inline: true }}
      />

      <FastField name={'payment_date'}>
        {({ form, field: { value }, meta: { error, touched } }) => (
          <FormGroup
            label={<T id={'payment_date'} />}
            labelInfo={<FieldRequiredHint />}
            className={classNames('form-group--select-list', Classes.FILL)}
            intent={inputIntent({ error, touched })}
            helperText={<ErrorMessage name="payment_date" />}
            inline={true}
          >
            <DateInput
              {...momentFormatter('YYYY/MM/DD')}
              value={tansformDateValue(value || payment_date)}
              onChange={handleDateChange((formattedDate) => {
                form.setFieldValue('payment_date', formattedDate);
              })}
              popoverProps={{ position: Position.BOTTOM, minimal: true }}
            />
          </FormGroup>
        )}
      </FastField>

      <FFormGroup
        name={'payment_number'}
        label={<T id={'payment_no'} />}
        inline={true}
        fastField
      >
        <FInputGroup name={'payment_number'} minimal={true} fastField />
      </FFormGroup>

      <FFormGroup
        name={'payment_account_id'}
        label={<T id={'payment_account'} />}
        labelInfo={<FieldRequiredHint />}
        items={accounts}
        shouldUpdate={accountsFieldShouldUpdate}
        inline={true}
        fastField={true}
      >
        <AccountsSelect
          name={'payment_account_id'}
          items={accounts}
          placeholder={<T id={'select_payment_account'} />}
          filterByTypes={[
            ACCOUNT_TYPE.CASH,
            ACCOUNT_TYPE.BANK,
            ACCOUNT_TYPE.OTHER_CURRENT_ASSET,
          ]}
          shouldUpdate={accountsFieldShouldUpdate}
          fastField={true}
          fill={true}
        />
      </FFormGroup>

      <FFormGroup
        name={'reference'}
        label={<T id={'reference'} />}
        inline={true}
        fastField
      >
        <FInputGroup name={'reference'} minimal={true} fastField />
      </FFormGroup>
    </Stack>
  );
}

function ExpensePaymentEntriesSync() {
  const {
    isNewMode,
    defaultExpenseId,
    setIsNewEntriesFetching,
  } = useExpensePaymentFormContext();
  const {
    values: { vendor_id: vendorId },
    setFieldValue,
  } = useFormikContext();
  const {
    data: newPageEntries,
    isFetching,
  } = useExpensePaymentNewPageEntries(vendorId, {
    enabled: !!vendorId && isNewMode,
    keepPreviousData: true,
  });

  React.useEffect(() => {
    setIsNewEntriesFetching(isFetching);
  }, [isFetching, setIsNewEntriesFetching]);

  React.useEffect(() => {
    if (!isFetching && newPageEntries && isNewMode) {
      const transformedEntries = transformToNewPageEntries(
        newPageEntries,
        defaultExpenseId,
      );
      setFieldValue('entries', transformedEntries);

      const firstEntry = transformedEntries[0];
      if (firstEntry?.currency_code) {
        setFieldValue('currency_code', firstEntry.currency_code);
      }
    }
  }, [defaultExpenseId, isFetching, isNewMode, newPageEntries, setFieldValue]);

  return null;
}

function ExpensePaymentFooter() {
  const { formattedTotal } = useExpensePaymentTotals();

  return (
    <x.div mt={'20px'} px={'32px'} pb={'20px'} flex={1}>
      <Paper p={'20px'}>
        <Row>
          <Col md={8}>
            <InternalNoteFormGroup
              name={'statement'}
              label={<T id={'payment_made.form.internal_note.label'} />}
              fastField={true}
            >
              <FEditableText
                name={'statement'}
                placeholder={intl.get(
                  'payment_made.form.internal_note.placeholder',
                )}
                fastField
                multiline
              />
            </InternalNoteFormGroup>
          </Col>

          <Col md={4}>
            <ExpensePaymentTotalLines>
              <TotalLine
                title={'Total'}
                value={formattedTotal}
                textStyle={TotalLineTextStyle.Bold}
              />
            </ExpensePaymentTotalLines>
          </Col>
        </Row>
      </Paper>
    </x.div>
  );
}

function ExpensePaymentFloatingActions() {
  const history = useHistory();
  const { isSubmitting, resetForm, submitForm } = useFormikContext();
  const { setSubmitPayload, expensePaymentId } = useExpensePaymentFormContext();

  return (
    <PageForm.FooterActions spacing={10}>
      <Button
        loading={isSubmitting}
        intent={Intent.PRIMARY}
        type="submit"
        onClick={() => setSubmitPayload({ redirect: true })}
        style={{ minWidth: '85px' }}
        text={expensePaymentId ? <T id={'edit'} /> : <T id={'save'} />}
      />
      <Button
        disabled={isSubmitting}
        onClick={() => {
          setSubmitPayload({ redirect: false, resetForm: true });
          submitForm();
        }}
        text={<T id={'save_and_new'} />}
      />
      <Button
        disabled={isSubmitting}
        onClick={resetForm}
        text={expensePaymentId ? <T id={'reset'} /> : <T id={'clear'} />}
      />
      <Button
        disabled={isSubmitting}
        onClick={() => history.goBack()}
        text={<T id={'cancel'} />}
      />
    </PageForm.FooterActions>
  );
}

function ExpensePaymentFormRoot({
  preferredPaymentAccount,
  organization: { base_currency },
}) {
  const history = useHistory();
  const location = useLocation();
  const {
    isNewMode,
    expensePaymentId,
    defaultExpense,
    paymentEditPage,
    paymentEntriesEditPage,
    submitPayload,
    createExpensePaymentMutate,
    editExpensePaymentMutate,
  } = useExpensePaymentFormContext();
  const redirectTo =
    submitPayload.redirectTo ||
    location.state?.redirectTo ||
    '/expenses/payments-made';

  const initialValues = React.useMemo(
    () =>
      !isNewMode
        ? transformToEditForm(paymentEditPage, paymentEntriesEditPage)
        : {
            ...defaultExpensePayment,
            vendor_id: defaultExpense?.payee_id || '',
            payment_account_id: preferredPaymentAccount || '',
            currency_code: defaultExpense?.currency_code || base_currency,
          },
    [
      isNewMode,
      paymentEditPage,
      paymentEntriesEditPage,
      defaultExpense,
      preferredPaymentAccount,
      base_currency,
    ],
  );

  const handleSubmit = (values, { setSubmitting, resetForm, setFieldError }) => {
    setSubmitting(true);
    const totalAmount = safeSumBy(values.entries, 'payment_amount');

    if (totalAmount <= 0) {
      AppToaster.show({
        message: 'Payment amount must be greater than zero.',
        intent: Intent.DANGER,
      });
      setSubmitting(false);
      return;
    }

    const form = transformFormToRequest(values);
    const onSaved = () => {
      AppToaster.show({
        message: intl.get(
          isNewMode
            ? 'the_payment_made_has_been_created_successfully'
            : 'the_payment_made_has_been_edited_successfully',
        ),
        intent: Intent.SUCCESS,
      });
      setSubmitting(false);

      if (submitPayload.redirect) {
        history.push(redirectTo);
      }
      if (submitPayload.resetForm) {
        resetForm();
      }
    };
    const onError = ({
      response: {
        data: { errors },
      },
    }) => {
      if (errors) {
        transformErrors(errors, { setFieldError });
      }
      setSubmitting(false);
    };

    if (!isNewMode) {
      return editExpensePaymentMutate([expensePaymentId, form])
        .then(onSaved)
        .catch(onError);
    }
    return createExpensePaymentMutate(form).then(onSaved).catch(onError);
  };

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize
      validationSchema={
        isNewMode ? CreateExpensePaymentFormSchema : EditExpensePaymentFormSchema
      }
      onSubmit={handleSubmit}
    >
      <Form
        className={css({
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        })}
      >
        <ExpensePaymentEntriesSync />
        <PageForm flex={1}>
          <PageForm.Body>
            <ExpensePaymentTopBar />
            <PageForm.Header>
              <ExpensePaymentHeaderFields />
              <ExpensePaymentBigNumber />
            </PageForm.Header>

            <Box p="18px 32px 0">
              <FastField name={'entries'}>
                {({ form: { setFieldValue }, field: { value } }) => (
                  <ExpensePaymentEntriesTable
                    entries={value}
                    onUpdateData={(newEntries) => {
                      setFieldValue('entries', newEntries);
                    }}
                  />
                )}
              </FastField>
            </Box>
            <ExpensePaymentFooter />
          </PageForm.Body>

          <PageForm.Footer>
            <ExpensePaymentFloatingActions />
          </PageForm.Footer>
        </PageForm>
      </Form>
    </Formik>
  );
}

function ExpensePaymentBigNumber() {
  const {
    values: { currency_code },
  } = useFormikContext();
  const { total } = useExpensePaymentTotals();

  return (
    <PageFormBigNumber
      label={'Payment Amount'}
      amount={<Money amount={total} currency={currency_code} />}
    />
  );
}

const VendorButtonLink = styled(VendorDrawerLink)`
  font-size: 11px;
  margin-top: 6px;
`;

const InternalNoteFormGroup = styled(FFormGroup)`
  &.bp4-form-group {
    margin-bottom: 40px;

    .bp4-label {
      font-size: 12px;
      margin-bottom: 12px;
    }
    .bp4-form-content {
      margin-left: 10px;
    }
  }
`;

const ExpensePaymentTotalLines = styled(TotalLines)`
  width: 100%;
`;

export default compose(
  withSettings(({ billPaymentSettings }) => ({
    preferredPaymentAccount: parseInt(billPaymentSettings?.withdrawalAccount),
  })),
  withCurrentOrganization(),
)(ExpensePaymentFormRoot);
