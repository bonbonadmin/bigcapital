// @ts-nocheck
import React from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { css } from '@emotion/css';
import { Formik, Form, FastField, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { x } from '@xstyled/emotion';
import { Button, Classes, Intent } from '@blueprintjs/core';
import { useHistory } from 'react-router-dom';

import {
  AccountsSelect,
  AppToaster,
  Box,
  CloudLoadingIndicator,
  DataTableEditable,
  DetailsBarSkeletonBase,
  FDateInput,
  FEditableText,
  FFormGroup,
  FInputGroup,
  FieldRequiredHint,
  FormattedMessage as T,
  Money,
  PageForm,
  Paper,
  Row,
  Col,
  TotalLine,
  TotalLineTextStyle,
  TotalLines,
} from '@/components';
import { CheckBoxFieldCell, MoneyFieldCell } from '@/components/DataTableCells';
import { ACCOUNT_TYPE } from '@/constants/accountTypes';
import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';
import { withSettings } from '@/containers/Settings/withSettings';
import {
  useAccounts,
  useBills,
  useCreateExpensePayment,
  useCreatePaymentMade,
  useExpenses,
  useSettings,
  useVendors,
} from '@/hooks/query';
import {
  compose,
  formattedAmount,
  momentFormatter,
  orderingLinesIndexes,
  safeSumBy,
  updateTableCell,
} from '@/utils';

const defaultValues = {
  payment_date: moment(new Date()).format('YYYY-MM-DD'),
  payment_account_id: '',
  reference: '',
  statement: '',
  entries: [],
};

const validationSchema = Yup.object().shape({
  payment_date: Yup.string().required(),
  payment_account_id: Yup.number().required(),
});

function normalizeBillEntry(bill) {
  return {
    id: `bill-${bill.id}`,
    selected: false,
    source_type: 'bill',
    type_label: 'Bill',
    vendor_id: bill.vendor_id,
    vendor_name: bill.vendor?.display_name || '-',
    transaction_date: bill.bill_date,
    transaction_no: bill.bill_number || bill.reference_no || '-',
    amount: Number(bill.total ?? bill.amount) || 0,
    due_amount: Number(bill.due_amount ?? bill.dueAmount) || 0,
    payment_amount: '',
    currency_code: bill.currency_code,
    bill_id: bill.id,
    expense_id: null,
  };
}

function normalizeExpenseEntry(expense, vendorsById) {
  const vendorId = expense.payee_id ?? expense.payeeId;

  return {
    id: `expense-${expense.id}`,
    selected: false,
    source_type: 'expense',
    type_label: 'Expense',
    vendor_id: vendorId,
    vendor_name:
      vendorsById[vendorId]?.display_name ||
      vendorsById[vendorId]?.displayName ||
      '-',
    transaction_date: expense.payment_date ?? expense.paymentDate,
    transaction_no: expense.reference_no || expense.referenceNo || '-',
    amount:
      Number(expense.total_amount ?? expense.totalAmount ?? expense.amount) || 0,
    due_amount: Number(expense.due_amount ?? expense.dueAmount) || 0,
    payment_amount: '',
    currency_code: expense.currency_code ?? expense.currencyCode,
    bill_id: null,
    expense_id: expense.id,
  };
}

function normalizeEntries(bills, expenses, vendorsById) {
  const normalizedBills = (bills || [])
    .filter((bill) => bill.is_open && (Number(bill.due_amount ?? bill.dueAmount) || 0) > 0)
    .map(normalizeBillEntry);

  const normalizedExpenses = (expenses || [])
    .filter(
      (expense) =>
        expense.is_open && (Number(expense.due_amount ?? expense.dueAmount) || 0) > 0,
    )
    .map((expense) => normalizeExpenseEntry(expense, vendorsById));

  return [...normalizedBills, ...normalizedExpenses].sort((a, b) => {
    const aDate = a.transaction_date ? new Date(a.transaction_date).getTime() : 0;
    const bDate = b.transaction_date ? new Date(b.transaction_date).getTime() : 0;

    return aDate - bDate;
  });
}

function CheckboxCell(props) {
  return <CheckBoxFieldCell {...props} />;
}

function DateCell({ value }) {
  return value ? moment(value).format('YYYY MMM DD') : '-';
}

function MoneyCell({ row: { original }, value }) {
  return <Money amount={value} currency={original.currency_code} />;
}

function useEntriesColumns() {
  return React.useMemo(
    () => [
      {
        Header: '',
        accessor: 'selected',
        Cell: CheckboxCell,
        disableSortBy: true,
        width: 54,
      },
      {
        Header: 'Type',
        accessor: 'type_label',
        disableSortBy: true,
        width: 100,
      },
      {
        Header: 'Vendor',
        accessor: 'vendor_name',
        disableSortBy: true,
        width: 180,
      },
      {
        Header: 'Date',
        accessor: 'transaction_date',
        Cell: DateCell,
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
        Cell: MoneyCell,
        disableSortBy: true,
        width: 150,
      },
      {
        Header: 'Amount Due',
        accessor: 'due_amount',
        Cell: MoneyCell,
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

function PaymentEntriesSync({ entries }) {
  const { values, setFieldValue } = useFormikContext();

  React.useEffect(() => {
    if (values.entries.length === 0 && entries.length === 0) {
      return;
    }
    setFieldValue('entries', orderingLinesIndexes(entries), false);
  }, [entries, setFieldValue]);

  return null;
}

function TotalAmountSync({ baseCurrency }) {
  const {
    values: { entries },
  } = useFormikContext();

  const total = React.useMemo(
    () =>
      safeSumBy(
        entries.filter((entry) => entry.selected),
        'payment_amount',
      ),
    [entries],
  );

  return (
    <BillsExpensesTotalLines>
      <TotalLine
        title={'Total'}
        value={formattedAmount(total, baseCurrency)}
        textStyle={TotalLineTextStyle.Bold}
      />
    </BillsExpensesTotalLines>
  );
}

function BillsExpensesEntriesTable({ isLoading }) {
  const columns = useEntriesColumns();
  const {
    values: { entries },
    errors,
    setFieldValue,
  } = useFormikContext();

  const updateData = React.useCallback(
    (rowIndex, columnId, value) => {
      let nextRows = compose(updateTableCell(rowIndex, columnId, value))(entries);
      const nextRow = nextRows[rowIndex];

      if (columnId === 'selected') {
        nextRows[rowIndex] = {
          ...nextRow,
          selected: Boolean(value),
          payment_amount: value ? Number(nextRow.due_amount) || 0 : '',
        };
      }

      if (columnId === 'payment_amount') {
        const numericValue = Number(value) || 0;
        nextRows[rowIndex] = {
          ...nextRow,
          payment_amount: value,
          selected: numericValue > 0,
        };
      }

      setFieldValue('entries', orderingLinesIndexes(nextRows), false);
    },
    [entries, setFieldValue],
  );

  return (
    <CloudLoadingIndicator isLoading={isLoading}>
      <DataTableEditable
        progressBarLoading={isLoading}
        columns={columns}
        data={entries}
        spinnerProps={false}
        payload={{
          errors: errors?.entries || [],
          updateData,
        }}
        noResults={'There are no open bills or payable expenses to show.'}
      />
    </CloudLoadingIndicator>
  );
}

function BottomFields({ accounts, baseCurrency }) {
  return (
    <Paper p={'20px'}>
      <Row>
        <Col md={8}>
          <FieldsStack>
            <FFormGroup
              name={'payment_date'}
              label={<T id={'payment_date'} />}
              labelInfo={<FieldRequiredHint />}
              inline
              fastField
            >
              <FDateInput
                name={'payment_date'}
                {...momentFormatter('YYYY/MM/DD')}
                fill
                fastField
                popoverProps={{ minimal: true }}
              />
            </FFormGroup>

            <FFormGroup
              name={'payment_account_id'}
              label={<T id={'payment_account'} />}
              labelInfo={<FieldRequiredHint />}
              items={accounts}
              inline
              fastField
            >
              <AccountsSelect
                name={'payment_account_id'}
                items={accounts}
                fill
                fastField
                placeholder={<T id={'select_payment_account'} />}
                filterByTypes={[
                  ACCOUNT_TYPE.CASH,
                  ACCOUNT_TYPE.BANK,
                  ACCOUNT_TYPE.OTHER_CURRENT_ASSET,
                ]}
              />
            </FFormGroup>

            <FFormGroup name={'reference'} label={'Reference #'} inline fastField>
              <FInputGroup name={'reference'} minimal fastField fill />
            </FFormGroup>

            <FFormGroup name={'statement'} label={'Note'} inline fastField>
              <FEditableText name={'statement'} multiline fastField />
            </FFormGroup>
          </FieldsStack>
        </Col>

        <Col md={4}>
          <TotalAmountSync baseCurrency={baseCurrency} />
        </Col>
      </Row>
    </Paper>
  );
}

function BillsExpensesFloatingActions({ setSubmitPayload }) {
  const history = useHistory();
  const { isSubmitting, resetForm, submitForm } = useFormikContext();

  return (
    <PageForm.FooterActions spacing={10}>
      <Button
        loading={isSubmitting}
        intent={Intent.PRIMARY}
        type="submit"
        onClick={() => setSubmitPayload({ redirect: true })}
        style={{ minWidth: '85px' }}
        text={<T id={'save'} />}
      />
      <Button
        disabled={isSubmitting}
        onClick={() => {
          setSubmitPayload({ redirect: false, resetForm: true });
          submitForm();
        }}
        text={<T id={'save_and_new'} />}
      />
      <Button disabled={isSubmitting} onClick={resetForm} text={<T id={'clear'} />} />
      <Button
        disabled={isSubmitting}
        onClick={() => history.goBack()}
        text={<T id={'cancel'} />}
      />
    </PageForm.FooterActions>
  );
}

function BillsExpensesFormRoot({
  preferredPaymentAccount,
  organization: { base_currency: baseCurrency },
}) {
  const history = useHistory();

  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();
  const {
    data: { vendors },
    isLoading: isVendorsLoading,
  } = useVendors({ page_size: 10000 });
  const {
    data: { bills },
    isLoading: isBillsLoading,
    isFetching: isBillsFetching,
  } = useBills({ page_size: 1000 }, { keepPreviousData: true });
  const {
    data: { expenses },
    isLoading: isExpensesLoading,
    isFetching: isExpensesFetching,
  } = useExpenses({ page_size: 1000 }, { keepPreviousData: true });

  useSettings();

  const { mutateAsync: createPaymentMadeMutate } = useCreatePaymentMade();
  const { mutateAsync: createExpensePaymentMutate } = useCreateExpensePayment();

  const [submitPayload, setSubmitPayload] = React.useState({});

  const vendorsById = React.useMemo(
    () =>
      (vendors || []).reduce((acc, vendor) => {
        acc[vendor.id] = vendor;
        return acc;
      }, {}),
    [vendors],
  );

  const entries = React.useMemo(
    () => normalizeEntries(bills, expenses, vendorsById),
    [bills, expenses, vendorsById],
  );

  const isLoading =
    isAccountsLoading || isVendorsLoading || isBillsLoading || isExpensesLoading;
  const isEntriesFetching = isBillsFetching || isExpensesFetching;

  const initialValues = React.useMemo(
    () => ({
      ...defaultValues,
      payment_account_id: preferredPaymentAccount || '',
      entries: orderingLinesIndexes(entries),
    }),
    [entries, preferredPaymentAccount],
  );

  return (
    <PageLoader loading={isLoading}>
      <Formik
        initialValues={initialValues}
        enableReinitialize
        validationSchema={validationSchema}
        onSubmit={async (values, { setSubmitting, resetForm, setFieldError }) => {
          setSubmitting(true);

          const selectedEntries = values.entries.filter(
            (entry) => entry.selected && Number(entry.payment_amount) > 0,
          );

          if (!selectedEntries.length) {
            AppToaster.show({
              message: 'Select at least one bill or expense to pay.',
              intent: Intent.DANGER,
            });
            setSubmitting(false);
            return;
          }

          const groupedEntries = selectedEntries.reduce((acc, entry) => {
            const key = `${entry.source_type}-${entry.vendor_id}`;

            if (!acc[key]) {
              acc[key] = {
                source_type: entry.source_type,
                vendor_id: entry.vendor_id,
                entries: [],
              };
            }
            acc[key].entries.push(entry);

            return acc;
          }, {});

          const commonPayload = {
            payment_date: values.payment_date,
            payment_account_id: values.payment_account_id,
            reference: values.reference,
            statement: values.statement,
            exchange_rate: 1,
          };

          try {
            for (const group of Object.values(groupedEntries)) {
              if (group.source_type === 'bill') {
                await createPaymentMadeMutate({
                  ...commonPayload,
                  vendor_id: group.vendor_id,
                  amount: safeSumBy(group.entries, 'payment_amount'),
                  entries: group.entries.map((entry) => ({
                    bill_id: entry.bill_id,
                    payment_amount: Number(entry.payment_amount),
                  })),
                });
                continue;
              }

              await createExpensePaymentMutate({
                ...commonPayload,
                vendor_id: group.vendor_id,
                amount: safeSumBy(group.entries, 'payment_amount'),
                entries: group.entries.map((entry) => ({
                  expense_id: entry.expense_id,
                  payment_amount: Number(entry.payment_amount),
                })),
              });
            }

            AppToaster.show({
              message: 'The payments have been created successfully.',
              intent: Intent.SUCCESS,
            });
            setSubmitting(false);

            if (submitPayload.redirect) {
              history.push('/payment-list/payments-made');
            }
            if (submitPayload.resetForm) {
              resetForm();
            }
          } catch (error) {
            const errors = error?.response?.data?.errors || [];

            if (errors[0]?.message) {
              setFieldError('payment_account_id', errors[0].message);
            }
            AppToaster.show({
              message:
                error?.response?.data?.message ||
                'Unable to create one or more payments.',
              intent: Intent.DANGER,
            });
            setSubmitting(false);
          }
        }}
      >
        <Form
          className={css({
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          })}
        >
          <PaymentEntriesSync entries={entries} />

          <PageForm flex={1}>
            <PageForm.Body>
              <Box p="18px 32px 0">
                <BillsExpensesEntriesTable isLoading={isEntriesFetching} />
              </Box>

              <x.div mt={'20px'} px={'32px'} pb={'20px'} flex={1}>
                <BottomFields accounts={accounts} baseCurrency={baseCurrency} />
              </x.div>
            </PageForm.Body>

            <PageForm.Footer>
              <BillsExpensesFloatingActions setSubmitPayload={setSubmitPayload} />
            </PageForm.Footer>
          </PageForm>
        </Form>
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

const FieldsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;

  .bp4-form-group {
    margin-bottom: 0;
  }

  .bp4-label {
    min-width: 150px;
    font-weight: 500;
  }
`;

const BillsExpensesTotalLines = styled(TotalLines)`
  width: 100%;
`;

export default compose(
  withSettings(({ billPaymentSettings }) => ({
    preferredPaymentAccount: parseInt(billPaymentSettings?.withdrawalAccount),
  })),
  withCurrentOrganization(),
)(BillsExpensesFormRoot);
