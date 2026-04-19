// @ts-nocheck
import React from 'react';
import moment from 'moment';
import intl from 'react-intl-universal';
import styled from 'styled-components';
import classNames from 'classnames';
import { Formik, Form, FastField, useFormikContext, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { css } from '@emotion/css';
import { Theme, useTheme } from '@emotion/react';
import { x } from '@xstyled/emotion';
import {
  Button,
  Classes,
  ControlGroup,
  FormGroup,
  Intent,
  NavbarGroup,
  Position,
} from '@blueprintjs/core';
import { useHistory } from 'react-router-dom';
import { useQuery } from 'react-query';

import {
  AccountsSelect,
  AppToaster,
  Box,
  BranchSelect,
  CloudLoadingIndicator,
  DataTableEditable,
  DetailsBarSkeletonBase,
  FDateInput,
  FEditableText,
  FFormGroup,
  FInputGroup,
  FMoneyInputGroup,
  FeatureCan,
  FieldRequiredHint,
  FormBranchSelectButton,
  FormTopbar,
  FormattedMessage as T,
  Icon,
  InputPrependText,
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
  ExchangeRateInputGroup,
} from '@/components';
import { MoneyFieldCell } from '@/components/DataTableCells';
import { ACCOUNT_TYPE } from '@/constants/accountTypes';
import { CLASSES } from '@/constants/classes';
import { Features } from '@/constants';
import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';
import { withSettings } from '@/containers/Settings/withSettings';
import { useFeatureCan, useCurrentOrganization } from '@/hooks/state';
import {
  useAccounts,
  useBranches,
  useCreateExpensePayment,
  useCreatePaymentMade,
  useSettings,
  useVendors,
} from '@/hooks/query';
import useApiRequest from '@/hooks/useRequest';
import {
  amountPaymentEntries,
  compose,
  formattedAmount,
  fullAmountPaymentEntries,
  momentFormatter,
  orderingLinesIndexes,
  safeSumBy,
  transformToForm,
  updateTableCell,
} from '@/utils';
import {
  accountsFieldShouldUpdate,
  vendorsFieldShouldUpdate,
  transformErrors as transformBillErrors,
} from '../PaymentForm/utils';
import { transformErrors as transformExpenseErrors } from '@/containers/Expenses/PaymentsMade/ExpensePaymentForm/utils';

const defaultCombinedPayment = {
  amount: '',
  vendor_id: '',
  payment_account_id: '',
  payment_date: moment(new Date()).format('YYYY-MM-DD'),
  reference: '',
  payment_number: '',
  statement: '',
  currency_code: '',
  branch_id: '',
  exchange_rate: 1,
  entries: [],
};

const defaultCombinedEntry = {
  id: null,
  entry_id: null,
  transaction_type: '',
  transaction_id: '',
  transaction_no: '',
  transaction_date: '',
  payment_amount: '',
  due_amount: null,
  amount: '',
  currency_code: '',
  bill_id: null,
  expense_id: null,
};

const validationSchema = Yup.object().shape({
  vendor_id: Yup.number().required(),
  payment_account_id: Yup.number().required(),
  payment_date: Yup.string().required(),
  entries: Yup.array().of(
    Yup.object().shape({
      payment_amount: Yup.number().nullable(),
    }),
  ),
});

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

function transformBillEntry(entry) {
  return {
    ...transformToForm(entry, defaultCombinedEntry),
    entry_id: `bill-${entry.bill_id}`,
    transaction_type: 'bill',
    transaction_id: entry.bill_id,
    transaction_no: entry.bill_no || '-',
    transaction_date: entry.bill_date,
    payment_amount: '',
    bill_id: entry.bill_id,
    expense_id: null,
    currency_code: entry.currency_code,
  };
}

function transformExpenseEntry(entry) {
  return {
    ...transformToForm(entry, defaultCombinedEntry),
    entry_id: `expense-${entry.expense_id}`,
    transaction_type: 'expense',
    transaction_id: entry.expense_id,
    transaction_no: entry.reference_no || '-',
    transaction_date: entry.date,
    payment_amount: '',
    bill_id: null,
    expense_id: entry.expense_id,
    currency_code: entry.currency_code,
  };
}

function normalizeEntries(billEntries, expenseEntries) {
  return [
    ...(billEntries || []).map(transformBillEntry),
    ...(expenseEntries || []).map(transformExpenseEntry),
  ].sort((a, b) => {
    const aDate = a.transaction_date ? new Date(a.transaction_date).getTime() : 0;
    const bDate = b.transaction_date ? new Date(b.transaction_date).getTime() : 0;
    return aDate - bDate;
  });
}

function useCombinedPaymentEntries(vendorId, enabled) {
  const apiRequest = useApiRequest();

  return useQuery(
    ['combined-payment-new-entries', vendorId],
    async () => {
      const [billResponse, expenseResponse] = await Promise.all([
        apiRequest.get('bill-payments/new-page/entries', {
          params: { vendor_id: vendorId },
        }),
        apiRequest.get('expense-payments/new-page/entries', {
          params: { vendor_id: vendorId },
        }),
      ]);

      return normalizeEntries(billResponse.data, expenseResponse.data);
    },
    {
      enabled,
      keepPreviousData: true,
      initialData: [],
    },
  );
}

function useCombinedPaymentTotals() {
  const {
    values: { entries, currency_code: currencyCode },
  } = useFormikContext();

  const total = React.useMemo(() => safeSumBy(entries, 'payment_amount'), [entries]);
  const formattedTotal = React.useMemo(
    () => formattedAmount(total, currencyCode),
    [total, currencyCode],
  );

  return { total, formattedTotal };
}

function useCombinedPaymentIsForeign() {
  const { values } = useFormikContext();
  const currentOrganization = useCurrentOrganization();

  return React.useMemo(
    () => values.currency_code !== currentOrganization.base_currency,
    [values.currency_code, currentOrganization.base_currency],
  );
}

function CombinedPaymentExchangeRateInputField(props) {
  const currentOrganization = useCurrentOrganization();
  const { values } = useFormikContext();
  const isForeign = useCombinedPaymentIsForeign();

  if (!isForeign) return null;

  return (
    <ExchangeRateInputGroup
      fromCurrency={values.currency_code}
      toCurrency={currentOrganization.base_currency}
      {...props}
    />
  );
}

function TransactionTypeCell({ value }) {
  return value === 'expense' ? 'Expense' : 'Bill';
}

function TransactionDateCell({ value }) {
  return value ? moment(value).format('YYYY MMM DD') : '-';
}

function MoneyTableCell({ row: { original }, value }) {
  return <Money amount={value} currency={original.currency_code} />;
}

function useCombinedEntriesColumns() {
  return React.useMemo(
    () => [
      {
        Header: 'Type',
        accessor: 'transaction_type',
        Cell: TransactionTypeCell,
        disableSortBy: true,
        width: 100,
      },
      {
        Header: 'Date',
        accessor: 'transaction_date',
        Cell: TransactionDateCell,
        disableSortBy: true,
        width: 140,
      },
      {
        Header: 'Transaction No.',
        accessor: 'transaction_no',
        disableSortBy: true,
        width: 160,
      },
      {
        Header: 'Amount',
        accessor: 'amount',
        Cell: MoneyTableCell,
        disableSortBy: true,
        width: 150,
      },
      {
        Header: 'Amount Due',
        accessor: 'due_amount',
        Cell: MoneyTableCell,
        disableSortBy: true,
        width: 150,
      },
      {
        Header: 'Payment Amount',
        accessor: 'payment_amount',
        Cell: MoneyFieldCell,
        disableSortBy: true,
        width: 150,
      },
    ],
    [],
  );
}

function CombinedPaymentTopBar({ branches, isBranchFeatureCan }) {
  if (!isBranchFeatureCan) return null;

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

function CombinedPaymentHeaderFields({ vendors, accounts }) {
  const {
    values: { entries, currency_code, vendor_id },
    setFieldValue,
  } = useFormikContext();
  const theme = useTheme();
  const fieldsClassName = getFieldsStyle(theme);

  const payableFullAmount = React.useMemo(
    () => safeSumBy(entries, 'due_amount'),
    [entries],
  );

  const handleReceiveFullAmountClick = () => {
    const newEntries = fullAmountPaymentEntries(entries);
    const fullAmount = safeSumBy(newEntries, 'payment_amount');

    setFieldValue('entries', newEntries);
    setFieldValue('amount', fullAmount);
  };

  const onFullAmountBlur = (value) => {
    const newEntries = amountPaymentEntries(Number(value) || 0, entries);
    setFieldValue('entries', newEntries);
  };

  return (
    <Stack spacing={18} flex={1} className={fieldsClassName}>
      <FFormGroup
        name={'vendor_id'}
        label={<T id={'vendor_name'} />}
        labelInfo={<FieldRequiredHint />}
        inline
        fastField
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
            setFieldValue('entries', [], false);
            setFieldValue('amount', '', false);
          }}
          allowCreate={true}
          fastField
          shouldUpdate={vendorsFieldShouldUpdate}
          shouldUpdateDeps={{ items: vendors }}
        />
        {vendor_id && (
          <VendorButtonLink vendorId={vendor_id}>
            <T id={'view_vendor_details'} />
          </VendorButtonLink>
        )}
      </FFormGroup>

      <CombinedPaymentExchangeRateInputField
        name={'exchange_rate'}
        formGroupProps={{ label: ' ', inline: true }}
      />

      <FFormGroup
        name={'payment_date'}
        label={<T id={'payment_date'} />}
        labelInfo={<FieldRequiredHint />}
        inline
        fill
        fastField
      >
        <FDateInput
          name={'payment_date'}
          {...momentFormatter('YYYY/MM/DD')}
          popoverProps={{ position: Position.BOTTOM, minimal: true }}
          inputProps={{ leftIcon: <Icon icon={'date-range'} /> }}
          fill
          fastField
        />
      </FFormGroup>

      <FFormGroup
        name={'amount'}
        label={<T id={'full_amount'} />}
        inline
        fastField
      >
        <ControlGroup>
          <InputPrependText text={currency_code} />
          <FMoneyInputGroup fastField name={'amount'} onBlurValue={onFullAmountBlur} />
        </ControlGroup>

        {entries.length > 0 && (
          <Button
            onClick={handleReceiveFullAmountClick}
            className={'receive-full-amount'}
            small
            minimal
          >
            <T id={'receive_full_amount'} /> (
            <Money amount={payableFullAmount} currency={currency_code} />)
          </Button>
        )}
      </FFormGroup>

      <FFormGroup name={'payment_number'} label={<T id={'payment_no'} />} inline fastField>
        <FInputGroup name={'payment_number'} minimal fastField />
      </FFormGroup>

      <FFormGroup
        name={'payment_account_id'}
        label={<T id={'payment_account'} />}
        labelInfo={<FieldRequiredHint />}
        items={accounts}
        shouldUpdate={accountsFieldShouldUpdate}
        inline
        fastField
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
          fastField
          fill
        />
      </FFormGroup>

      <FFormGroup name={'reference'} label={<T id={'reference'} />} inline fastField>
        <FInputGroup name={'reference'} minimal fastField />
      </FFormGroup>
    </Stack>
  );
}

function CombinedPaymentEntriesTable({ entries, onUpdateData, isLoading }) {
  const columns = useCombinedEntriesColumns();
  const {
    values: { vendor_id, currency_code },
    errors,
  } = useFormikContext();

  const handleUpdateData = React.useCallback(
    (rowIndex, columnId, value) => {
      const newRows = compose(updateTableCell(rowIndex, columnId, value))(entries);
      onUpdateData(newRows);
    },
    [entries, onUpdateData],
  );

  const noResultsMessage = vendor_id
    ? 'There are no payable bills or expenses for this vendor.'
    : 'Select a vendor to display open bills and expenses.';

  return (
    <CloudLoadingIndicator isLoading={isLoading}>
      <DataTableEditable
        progressBarLoading={isLoading}
        className={classNames(CLASSES.DATATABLE_EDITOR_ITEMS_ENTRIES)}
        columns={columns}
        data={entries}
        spinnerProps={false}
        payload={{
          errors: errors?.entries || [],
          updateData: handleUpdateData,
          currencyCode,
        }}
        noResults={noResultsMessage}
      />
    </CloudLoadingIndicator>
  );
}

function CombinedPaymentFooter() {
  const { formattedTotal } = useCombinedPaymentTotals();

  return (
    <x.div mt={'20px'} px={'32px'} pb={'20px'} flex={1}>
      <Paper p={'20px'}>
        <Row>
          <Col md={8}>
            <InternalNoteFormGroup
              name={'statement'}
              label={<T id={'payment_made.form.internal_note.label'} />}
              fastField
            >
              <FEditableText
                name={'statement'}
                placeholder={intl.get('payment_made.form.internal_note.placeholder')}
                fastField
                multiline
              />
            </InternalNoteFormGroup>
          </Col>

          <Col md={4}>
            <CombinedPaymentTotalLines>
              <TotalLine
                title={'Total'}
                value={formattedTotal}
                textStyle={TotalLineTextStyle.Bold}
              />
            </CombinedPaymentTotalLines>
          </Col>
        </Row>
      </Paper>
    </x.div>
  );
}

function CombinedPaymentFloatingActions({ onBeforeSubmit }) {
  const history = useHistory();
  const { isSubmitting, resetForm, submitForm } = useFormikContext();

  return (
    <PageForm.FooterActions spacing={10}>
      <Button
        loading={isSubmitting}
        intent={Intent.PRIMARY}
        type="submit"
        onClick={() => onBeforeSubmit({ redirect: true })}
        style={{ minWidth: '85px' }}
        text={<T id={'save'} />}
      />
      <Button
        disabled={isSubmitting}
        onClick={() => {
          onBeforeSubmit({ redirect: false, resetForm: true });
          submitForm();
        }}
        text={<T id={'save_and_new'} />}
      />
      <Button disabled={isSubmitting} onClick={resetForm} text={<T id={'clear'} />} />
      <Button disabled={isSubmitting} onClick={() => history.goBack()} text={<T id={'cancel'} />} />
    </PageForm.FooterActions>
  );
}

function CombinedPaymentAmountSync() {
  const {
    values: { entries, amount },
    setFieldValue,
  } = useFormikContext();

  React.useEffect(() => {
    const total = safeSumBy(entries, 'payment_amount');
    if (Number(amount || 0) !== total) {
      setFieldValue('amount', total, false);
    }
  }, [amount, entries, setFieldValue]);

  return null;
}

function CombinedPaymentFormContent({
  branches,
  entries,
  accounts,
  vendors,
  isBranchFeatureCan,
  isBranchesSuccess,
  isEntriesFetching,
  setSelectedVendorId,
  setSubmitPayload,
}) {
  const { values, setFieldValue } = useFormikContext();

  React.useEffect(() => {
    if (isBranchesSuccess && isBranchFeatureCan && !values.branch_id) {
      const primaryBranch =
        branches?.find((branch) => branch.primary) || branches?.[0];

      if (primaryBranch) {
        setFieldValue('branch_id', primaryBranch.id, false);
      }
    }
  }, [
    branches,
    isBranchesSuccess,
    isBranchFeatureCan,
    setFieldValue,
    values.branch_id,
  ]);

  React.useEffect(() => {
    setSelectedVendorId(values.vendor_id || null);
  }, [setSelectedVendorId, values.vendor_id]);

  React.useEffect(() => {
    if (!values.vendor_id) {
      setFieldValue('entries', [], false);
      return;
    }
    if (!isEntriesFetching) {
      setFieldValue('entries', orderingLinesIndexes(entries), false);
    }
  }, [entries, isEntriesFetching, setFieldValue, values.vendor_id]);

  return (
    <Form
      className={css({
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      })}
    >
      <CombinedPaymentAmountSync />

      <PageForm flex={1}>
        <PageForm.Body>
          <CombinedPaymentTopBar
            branches={branches}
            isBranchFeatureCan={isBranchFeatureCan}
          />

          <PageForm.Header>
            <CombinedPaymentHeaderFields vendors={vendors} accounts={accounts} />
            <PageFormBigNumber
              label={<T id={'amount_received'} />}
              amount={<Money amount={values.amount} currency={values.currency_code} />}
            />
          </PageForm.Header>

          <Box p="18px 32px 0">
            <FastField name={'entries'}>
              {({ field: { value } }) => (
                <CombinedPaymentEntriesTable
                  entries={value}
                  isLoading={isEntriesFetching}
                  onUpdateData={(newEntries) => {
                    setFieldValue('entries', newEntries);
                  }}
                />
              )}
            </FastField>
          </Box>

          <CombinedPaymentFooter />
        </PageForm.Body>

        <PageForm.Footer>
          <CombinedPaymentFloatingActions onBeforeSubmit={setSubmitPayload} />
        </PageForm.Footer>
      </PageForm>
    </Form>
  );
}

function CombinedPaymentFormRoot({
  preferredPaymentAccount,
  organization: { base_currency },
}) {
  const history = useHistory();
  const { featureCan } = useFeatureCan();
  const isBranchFeatureCan = featureCan(Features.Branches);

  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();
  const {
    data: { vendors },
    isLoading: isVendorsLoading,
  } = useVendors({ page_size: 10000 });
  const {
    data: branches,
    isLoading: isBranchesLoading,
    isSuccess: isBranchesSuccess,
  } = useBranches(undefined, { enabled: isBranchFeatureCan });

  useSettings();

  const { mutateAsync: createPaymentMadeMutate } = useCreatePaymentMade();
  const { mutateAsync: createExpensePaymentMutate } = useCreateExpensePayment();

  const [submitPayload, setSubmitPayload] = React.useState({});
  const [selectedVendorId, setSelectedVendorId] = React.useState(null);

  const {
    data: entries,
    isFetching: isEntriesFetching,
  } = useCombinedPaymentEntries(selectedVendorId, !!selectedVendorId);

  const initialValues = React.useMemo(
    () => ({
      ...defaultCombinedPayment,
      payment_account_id: preferredPaymentAccount || '',
      currency_code: base_currency,
      entries: orderingLinesIndexes(defaultCombinedPayment.entries),
    }),
    [preferredPaymentAccount, base_currency],
  );

  const isLoading =
    isAccountsLoading || isVendorsLoading || (isBranchFeatureCan && isBranchesLoading);

  return (
    <PageLoader loading={isLoading}>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={async (values, { setSubmitting, resetForm, setFieldError }) => {
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

          const billEntries = values.entries
            .filter((entry) => entry.transaction_type === 'bill' && entry.bill_id && entry.payment_amount)
            .map((entry) => ({
              bill_id: entry.bill_id,
              payment_amount: entry.payment_amount,
            }));
          const expenseEntries = values.entries
            .filter(
              (entry) =>
                entry.transaction_type === 'expense' &&
                entry.expense_id &&
                entry.payment_amount,
            )
            .map((entry) => ({
              expense_id: entry.expense_id,
              payment_amount: entry.payment_amount,
            }));

          if (!billEntries.length && !expenseEntries.length) {
            AppToaster.show({
              message: 'Select at least one bill or expense to pay.',
              intent: Intent.DANGER,
            });
            setSubmitting(false);
            return;
          }

          const commonPayload = {
            vendor_id: values.vendor_id,
            payment_account_id: values.payment_account_id,
            payment_date: values.payment_date,
            payment_number: values.payment_number,
            reference: values.reference,
            statement: values.statement,
            currency_code: values.currency_code,
            branch_id: values.branch_id,
            exchange_rate: values.exchange_rate,
          };

          try {
            if (billEntries.length) {
              await createPaymentMadeMutate({
                ...commonPayload,
                amount: safeSumBy(billEntries, 'payment_amount'),
                entries: billEntries,
              });
            }

            if (expenseEntries.length) {
              await createExpensePaymentMutate({
                ...commonPayload,
                amount: safeSumBy(expenseEntries, 'payment_amount'),
                entries: expenseEntries,
              });
            }

            AppToaster.show({
              message: 'The payment has been created successfully.',
              intent: Intent.SUCCESS,
            });
            setSubmitting(false);

            if (submitPayload.redirect) {
              if (!billEntries.length && expenseEntries.length) {
                history.push('/expenses/payments-made');
              } else {
                history.push('/payments-made');
              }
            }
            if (submitPayload.resetForm) {
              resetForm();
            }
          } catch (error) {
            const errors = error?.response?.data?.errors || [];
            transformBillErrors(errors, { setFieldError });
            transformExpenseErrors(errors, { setFieldError });
            setSubmitting(false);
          }
        }}
      >
        <CombinedPaymentFormContent
          branches={branches}
          entries={entries}
          accounts={accounts}
          vendors={vendors}
          isBranchFeatureCan={isBranchFeatureCan}
          isBranchesSuccess={isBranchesSuccess}
          isEntriesFetching={isEntriesFetching}
          setSelectedVendorId={setSelectedVendorId}
          setSubmitPayload={setSubmitPayload}
        />
      </Formik>
    </PageLoader>
  );
}

function PageLoader({ loading, children }) {
  if (!loading) return children;

  return (
    <div className={css({ flex: 1 })}>
      <DetailsBarSkeletonBase className={Classes.SKELETON} />
    </div>
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

const CombinedPaymentTotalLines = styled(TotalLines)`
  width: 100%;
`;

export default compose(
  withSettings(({ billPaymentSettings }) => ({
    preferredPaymentAccount: parseInt(billPaymentSettings?.withdrawalAccount),
  })),
  withCurrentOrganization(),
)(CombinedPaymentFormRoot);
