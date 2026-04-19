// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { Formik } from 'formik';
import { Intent } from '@blueprintjs/core';
import { omit } from 'lodash';
import { AppToaster } from '@/components';
import { CreateQuickPaymentMadeFormSchema } from './QuickPaymentMade.schema';
import { useQuickPaymentMadeContext } from './QuickPaymentMadeFormProvider';
import QuickPaymentMadeFormContent from './QuickPaymentMadeFormContent';

import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import {
  defaultPaymentMade,
  transformResourceToForm,
  transformErrors,
} from './utils';
import { compose } from '@/utils';

/**
 * Quick payment made form.
 */
function QuickPaymentMadeForm({
  // #withDialogActions
  closeDialog,
}) {
  const {
    resource,
    resourceType,
    dialogName,
    createPaymentMadeMutate,
    createExpensePaymentMutate,
  } = useQuickPaymentMadeContext();

  // Initial form values.
  const initialValues = {
    ...defaultPaymentMade,
    ...transformResourceToForm(resource),
  };
  // Handles the form submit.
  const handleFormSubmit = (values, { setSubmitting, setFieldError }) => {
    const entries =
      resourceType === 'expense'
        ? [
            {
              payment_amount: values.amount,
              expense_id: values.expense_id,
            },
          ]
        : [
            {
              payment_amount: values.amount,
              bill_id: values.bill_id,
            },
          ];
    const form = {
      ...omit(values, ['bill_id', 'expense_id', 'vendor_display_name']),
      entries,
    };
    const createPaymentMutate =
      resourceType === 'expense'
        ? createExpensePaymentMutate
        : createPaymentMadeMutate;

    // Handle request response success.
    const onSuccess = () => {
      AppToaster.show({
        message: intl.get('the_payment_made_has_been_created_successfully'),
        intent: Intent.SUCCESS,
      });
      closeDialog(dialogName);
    };
    // Handle request response errors.
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
    createPaymentMutate(form).then(onSuccess).catch(onError);
  };

  return (
    <Formik
      validationSchema={CreateQuickPaymentMadeFormSchema}
      initialValues={initialValues}
      onSubmit={handleFormSubmit}
      component={QuickPaymentMadeFormContent}
    />
  );
}

export default compose(withDialogActions)(QuickPaymentMadeForm);
