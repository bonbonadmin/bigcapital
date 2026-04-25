// @ts-nocheck
import React from 'react';
import {
  Intent,
  Button,
  ButtonGroup,
  Popover,
  PopoverInteractionKind,
  Position,
  Menu,
  MenuItem,
} from '@blueprintjs/core';
import { useFormikContext } from 'formik';
import { FormattedMessage as T, PageForm, Group } from '@/components';
import { useHistory } from 'react-router-dom';

import { Icon, If } from '@/components';
import { useExpenseFormContext } from './ExpenseFormPageProvider';

/**
 * Expense form floating actions.
 */
export default function ExpenseFloatingFooter() {
  const history = useHistory();

  // Formik context.
  const { isSubmitting, submitForm, resetForm, setFieldValue } =
    useFormikContext();

  // Expense form context.
  const { setSubmitPayload, isNewMode } = useExpenseFormContext();

  const submitWithPayload = async (payload) => {
    setSubmitPayload(payload);
    await setFieldValue('publish', payload.publish, false);
    submitForm();
  };

  // Handle submit & publish button click.
  const handleSubmitPublishBtnClick = async (event) => {
    await submitWithPayload({ redirect: true, publish: true });
  };

  // Handle submit, publish & new button click.
  const handleSubmitPublishAndNewBtnClick = async (event) => {
    await submitWithPayload({
      redirect: false,
      publish: true,
      resetForm: true,
    });
  };

  // Handle submit, publish & continue editing button click.
  const handleSubmitPublishContinueEditingBtnClick = async (event) => {
    await submitWithPayload({ redirect: false, publish: true });
  };

  // Handle submit as draft button click.
  const handleSubmitDraftBtnClick = async (event) => {
    await submitWithPayload({ redirect: true, publish: false });
  };

  // Handle submit as draft & new button click.
  const handleSubmitDraftAndNewBtnClick = async (event) => {
    await submitWithPayload({
      redirect: false,
      publish: false,
      resetForm: true,
    });
  };

  // Handles submit as draft & continue editing button click.
  const handleSubmitDraftContinueEditingBtnClick = async (event) => {
    await submitWithPayload({ redirect: false, publish: false });
  };

  // Handle cancel button click.
  const handleCancelBtnClick = (event) => {
    history.goBack();
  };

  // Handles clear form button click.
  const handleClearBtnClick = (event) => {
    resetForm();
  };

  return (
    <PageForm.FooterActions spacing={10} position="apart">
      <Group spacing={10}>
        {/* ----------- Save And Publish ----------- */}
        <If condition={isNewMode}>
          <ButtonGroup>
            <Button
              disabled={isSubmitting}
              loading={isSubmitting}
              intent={Intent.PRIMARY}
              onClick={handleSubmitPublishBtnClick}
              text={<T id={'save_publish'} />}
            />
            <Popover
              content={
                <Menu>
                  <MenuItem
                    text={<T id={'publish_and_new'} />}
                    onClick={handleSubmitPublishAndNewBtnClick}
                  />
                  <MenuItem
                    text={<T id={'publish_continue_editing'} />}
                    onClick={handleSubmitPublishContinueEditingBtnClick}
                  />
                </Menu>
              }
              minimal={true}
              interactionKind={PopoverInteractionKind.CLICK}
              position={Position.BOTTOM_LEFT}
            >
              <Button
                disabled={isSubmitting}
                intent={Intent.PRIMARY}
                rightIcon={<Icon icon="arrow-drop-up-16" iconSize={20} />}
              />
            </Popover>
          </ButtonGroup>
          {/* ----------- Save As Draft ----------- */}
          <ButtonGroup>
            <Button
              disabled={isSubmitting}
              className={'ml1'}
              onClick={handleSubmitDraftBtnClick}
              text={<T id={'save_as_draft'} />}
            />
            <Popover
              content={
                <Menu>
                  <MenuItem
                    text={<T id={'save_and_new'} />}
                    onClick={handleSubmitDraftAndNewBtnClick}
                  />
                  <MenuItem
                    text={<T id={'save_continue_editing'} />}
                    onClick={handleSubmitDraftContinueEditingBtnClick}
                  />
                </Menu>
              }
              minimal={true}
              interactionKind={PopoverInteractionKind.CLICK}
              position={Position.BOTTOM_LEFT}
            >
              <Button
                disabled={isSubmitting}
                rightIcon={<Icon icon="arrow-drop-up-16" iconSize={20} />}
              />
            </Popover>
          </ButtonGroup>
        </If>
        {/* ----------- Save and New ----------- */}
        <If condition={!isNewMode}>
          <ButtonGroup>
            <Button
              disabled={isSubmitting}
              loading={isSubmitting}
              intent={Intent.PRIMARY}
              onClick={handleSubmitPublishBtnClick}
              style={{ minWidth: '85px' }}
              text={<T id={'save'} />}
            />
            <Popover
              content={
                <Menu>
                  <MenuItem
                    text={<T id={'save_and_new'} />}
                    onClick={handleSubmitPublishAndNewBtnClick}
                  />
                </Menu>
              }
              minimal={true}
              interactionKind={PopoverInteractionKind.CLICK}
              position={Position.BOTTOM_LEFT}
            >
              <Button
                disabled={isSubmitting}
                intent={Intent.PRIMARY}
                rightIcon={<Icon icon="arrow-drop-up-16" iconSize={20} />}
              />
            </Popover>
          </ButtonGroup>
        </If>
        {/* ----------- Clear & Reset----------- */}
        <Button
          className={'ml1'}
          disabled={isSubmitting}
          onClick={handleClearBtnClick}
          text={!isNewMode ? <T id={'reset'} /> : <T id={'clear'} />}
        />
        {/* ----------- Cancel ----------- */}
        <Button
          className={'ml1'}
          onClick={handleCancelBtnClick}
          text={<T id={'cancel'} />}
        />
      </Group>
    </PageForm.FooterActions>
  );
}
