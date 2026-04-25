// @ts-nocheck
import React from 'react';
import { Intent } from '@blueprintjs/core';
import { useHistory } from 'react-router-dom';
import { AppToaster, DashboardInsider } from '@/components';
import { useNextBillImageReview } from '@/hooks/query';
import styles from './UploadBillPage.module.scss';

export default function UploadBillReviewPage() {
  const history = useHistory();
  const { mutateAsync: fetchNextBillImageReview } = useNextBillImageReview();

  React.useEffect(() => {
    const openNextBillReview = async () => {
      try {
        const reviewItem = await fetchNextBillImageReview();

        if (!reviewItem?.id) {
          AppToaster.show({
            intent: Intent.WARNING,
            message: 'There are no mapped bill images waiting for review.',
          });
          history.replace('/expenses/upload-bill');
          return;
        }

        history.replace(
          `/expenses/new?mode=${reviewItem.mode}&bill_image_id=${reviewItem.id}&bill_review=1`,
        );
      } catch (error) {
        AppToaster.show({
          intent: Intent.DANGER,
          message:
            error?.response?.data?.message ||
            error?.message ||
            'The next bill review item could not be opened right now.',
        });
        history.replace('/expenses/upload-bill');
      }
    };

    openNextBillReview();
  }, [fetchNextBillImageReview, history]);

  return (
    <DashboardInsider loading name={'upload-bill-review-page'}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Bill Review</h1>
            <p className={styles.subtitle}>Opening the next mapped bill...</p>
          </div>
        </div>
      </div>
    </DashboardInsider>
  );
}
