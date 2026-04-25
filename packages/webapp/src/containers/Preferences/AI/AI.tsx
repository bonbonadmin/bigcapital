// @ts-nocheck
import React, { useEffect } from 'react';
import classNames from 'classnames';
import styled from 'styled-components';
import { Button, Callout, Intent } from '@blueprintjs/core';
import { AppToaster, Card } from '@/components';
import { CLASSES } from '@/constants/classes';
import { compose } from '@/utils';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { useEmbedTransactions, useEmbedVendors } from '@/hooks/query';

function AIPreferences({ changePreferencesPageTitle }) {
  const {
    mutateAsync: embedTransactions,
    isLoading: isEmbeddingTransactions,
  } = useEmbedTransactions();
  const { mutateAsync: embedVendors, isLoading: isEmbeddingVendors } =
    useEmbedVendors();

  useEffect(() => {
    changePreferencesPageTitle('AI');
  }, [changePreferencesPageTitle]);

  const handleEmbedTransactions = async () => {
    try {
      await embedTransactions();
      AppToaster.show({
        intent: Intent.SUCCESS,
        message: 'Transaction embedding job has been queued.',
      });
    } catch (error) {
      AppToaster.show({
        intent: Intent.DANGER,
        message:
          error?.response?.data?.message ||
          'Failed to queue the transaction embedding job.',
      });
    }
  };

  const handleEmbedVendors = async () => {
    try {
      await embedVendors();
      AppToaster.show({
        intent: Intent.SUCCESS,
        message: 'Vendor embedding job has been queued.',
      });
    } catch (error) {
      AppToaster.show({
        intent: Intent.DANGER,
        message:
          error?.response?.data?.message ||
          'Failed to queue the vendor embedding job.',
      });
    }
  };

  return (
    <div
      className={classNames(
        CLASSES.PREFERENCES_PAGE_INSIDE_CONTENT,
        CLASSES.PREFERENCES_PAGE_INSIDE_CONTENT_GENERAL,
      )}
    >
      <AIPreferencesCard>
        <Callout intent={Intent.PRIMARY}>
          Run tenant-scoped OpenAI embedding syncs for vendor contacts and
          transaction notes. Jobs run in the background and write to the
          PostgreSQL `pgvector` tables for the current organization.
        </Callout>

        <ButtonGroup>
          <Button
            intent={Intent.PRIMARY}
            loading={isEmbeddingTransactions}
            onClick={handleEmbedTransactions}
          >
            Embed Transactions
          </Button>
          <Button
            intent={Intent.PRIMARY}
            loading={isEmbeddingVendors}
            onClick={handleEmbedVendors}
          >
            Embed Vendors
          </Button>
        </ButtonGroup>
      </AIPreferencesCard>
    </div>
  );
}

const AIPreferencesCard = styled(Card)`
  padding: 1.25rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
`;

export default compose(withDashboardActions)(AIPreferences);
