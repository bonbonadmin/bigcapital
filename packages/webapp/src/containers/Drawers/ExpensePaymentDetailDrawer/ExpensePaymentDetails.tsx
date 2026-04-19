// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import intl from 'react-intl-universal';
import { Tab } from '@blueprintjs/core';
import { DrawerMainTabs } from '@/components';
import ExpensePaymentDetailActionsBar from './ExpensePaymentDetailActionsBar';
import ExpensePaymentDetailTab from './ExpensePaymentDetailTab';
import ExpensePaymentGLEntriesPanel from './ExpensePaymentGLEntriesPanel';

function ExpensePaymentDetailsTabs() {
  return (
    <DrawerMainTabs defaultSelectedTabId="details">
      <Tab
        id={'details'}
        title={intl.get('details')}
        panel={<ExpensePaymentDetailTab />}
      />
      <Tab
        id={'journal_entries'}
        title={intl.get('journal_entries')}
        panel={<ExpensePaymentGLEntriesPanel />}
      />
    </DrawerMainTabs>
  );
}

export default function ExpensePaymentDetails() {
  return (
    <ExpensePaymentDetailsRoot>
      <ExpensePaymentDetailActionsBar />
      <ExpensePaymentDetailsTabs />
    </ExpensePaymentDetailsRoot>
  );
}

const ExpensePaymentDetailsRoot = styled.div``;
