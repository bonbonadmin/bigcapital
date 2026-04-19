// @ts-nocheck
import React, { useMemo } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { defaultTo, sumBy, isEmpty } from 'lodash';
import { Formik, Form } from 'formik';
import { useHistory } from 'react-router-dom';
import { css } from '@emotion/css';

import ExpenseFormBody from './ExpenseFormBody';
import ExpenseFormHeader from './ExpenseFormHeader';
import ExpenseFloatingFooter from './ExpenseFloatingActions';
import ExpenseFormFooter from './ExpenseFormFooter';
import ExpenseFormTopBar from './ExpenseFormTopBar';

import { useExpenseFormContext } from './ExpenseFormPageProvider';

import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { withSettings } from '@/containers/Settings/withSettings';
import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';

import { AppToaster, Box } from '@/components';
import { PageForm } from '@/components/PageForm';
import { ACCOUNT_TYPE } from '@/constants';
import {
  CreateExpenseFormSchema,
  EditExpenseFormSchema,
} from './ExpenseForm.schema';
import {
  transformErrors,
  defaultExpense,
  transformToEditForm,
  transformFormValuesToRequest,
} from './utils';
import { compose, nestedArrayToflatten } from '@/utils';
import { EXPENSE_FORM_MODE } from './constants';

/**
 * Expense form.
 */
function ExpenseForm({
  // #withSettings
  preferredPaymentAccount,
  // #withCurrentOrganization
  organization: { base_currency },
}) {
  // Expense form context.
  const {
    editExpenseMutate,
    createExpenseMutate,
    expense,
    expenseId,
    accounts,
    expenseMode,
    submitPayloadRef,
  } = useExpenseFormContext();

  const isNewMode = !expenseId;

  // History context.
  const history = useHistory();

  // Form initial values.
  const preferredPayableAccount = useMemo(
    () =>
      nestedArrayToflatten(accounts).find(
        (account) => account.account_type === ACCOUNT_TYPE.ACCOUNTS_PAYABLE,
      )?.id,
    [accounts],
  );

  const initialValues = useMemo(
    () => ({
      ...(!isEmpty(expense)
        ? {
            ...transformToEditForm(expense, defaultExpense),
            expense_mode:
              expense.payable_account_id || expense.payableAccountId
                ? EXPENSE_FORM_MODE.PAYABLE
                : EXPENSE_FORM_MODE.PAID,
          }
        : {
            ...defaultExpense,
            expense_mode: expenseMode,
            currency_code: base_currency,
            payment_account_id:
              expenseMode === EXPENSE_FORM_MODE.PAID
                ? defaultTo(preferredPaymentAccount, '')
                : '',
            payable_account_id:
              expenseMode === EXPENSE_FORM_MODE.PAYABLE
                ? defaultTo(preferredPayableAccount, '')
                : '',
          }),
    }),
    [
      expense,
      expenseMode,
      base_currency,
      preferredPayableAccount,
      preferredPaymentAccount,
    ],
  );

  //  Handle form submit.
  const handleSubmit = (values, { setSubmitting, setErrors, resetForm }) => {
    setSubmitting(true);
    const totalAmount = sumBy(values.categories, 'amount');

    if (totalAmount <= 0) {
      AppToaster.show({
        message: intl.get('amount_cannot_be_zero_or_empty'),
        intent: Intent.DANGER,
      });
      setSubmitting(false);
      return;
    }

    // Get submit payload from ref for synchronous access
    const currentSubmitPayload = submitPayloadRef?.current || {};

    const form = {
      ...transformFormValuesToRequest(values),
      publish: currentSubmitPayload.publish,
    };
    // Handle request success.
    const handleSuccess = (response) => {
      AppToaster.show({
        message: intl.get(
          isNewMode
            ? 'the_expense_has_been_created_successfully'
            : 'the_expense_has_been_edited_successfully',
          { number: values.payment_account_id },
        ),
        intent: Intent.SUCCESS,
      });
      setSubmitting(false);

      if (currentSubmitPayload.redirect) {
        history.push('/expenses');
      }
      if (currentSubmitPayload.resetForm) {
        resetForm();
      }
    };

    // Handle the request error.
    const handleError = ({
      response: {
        data: { errors },
      },
    }) => {
      transformErrors(errors, { setErrors });
      setSubmitting(false);
    };
    if (isNewMode) {
      createExpenseMutate(form).then(handleSuccess).catch(handleError);
    } else {
      editExpenseMutate([expense.id, form])
        .then(handleSuccess)
        .catch(handleError);
    }
  };

  return (
    <Formik
      validationSchema={
        isNewMode ? CreateExpenseFormSchema : EditExpenseFormSchema
      }
      initialValues={initialValues}
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
        <PageForm flex={1}>
          <PageForm.Body>
            <ExpenseFormTopBar />
            <ExpenseFormHeader />

            <Box p="18px 32px 0">
              <ExpenseFormBody />
            </Box>
            <ExpenseFormFooter />
          </PageForm.Body>

          <PageForm.Footer>
            <ExpenseFloatingFooter />
          </PageForm.Footer>
        </PageForm>
      </Form>
    </Formik>
  );
}

export default compose(
  withDashboardActions,
  withSettings(({ expenseSettings }) => ({
    preferredPaymentAccount: parseInt(
      expenseSettings?.preferredPaymentAccount,
      10,
    ),
  })),
  withCurrentOrganization(),
)(ExpenseForm);
