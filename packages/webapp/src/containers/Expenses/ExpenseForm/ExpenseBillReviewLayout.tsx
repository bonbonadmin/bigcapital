// @ts-nocheck
import React from 'react';
import { Button, Card, Elevation, Tag } from '@blueprintjs/core';
import { useHistory } from 'react-router-dom';
import { FFormGroup, FTextArea } from '@/components';
import ExpenseFormTopBar from './ExpenseFormTopBar';
import ExpenseFormHeaderFields from './ExpenseFormHeaderFields';
import ExpenseFormEntriesField from './ExpenseFormEntriesField';
import { ExpenseFormFooterRight } from './ExpenseFormFooterRight';
import ExpenseFloatingFooter from './ExpenseFloatingActions';
import { useExpenseFormContext } from './ExpenseFormPageProvider';
import styles from './ExpenseBillReviewLayout.module.scss';

export default function ExpenseBillReviewLayout() {
  const { billImageReview } = useExpenseFormContext();
  const suggestions = billImageReview?.billData?.suggestions || {};

  return (
    <div className={styles.shell}>
      <div className={styles.previewPane}>
        <BillReviewImageViewer
          imageUrl={billImageReview?.imageUrl}
          fileType={billImageReview?.fileType}
        />
      </div>

      <div className={styles.formPane}>
        <div className={styles.formScroll}>
          <ExpenseFormTopBar />

          <Card elevation={Elevation.ONE} className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Bill Review</h2>
                <p className={styles.sectionSubtitle}>
                  Review the extracted bill and confirm the mapped expense.
                </p>
              </div>
              <Tag minimal large>
                Bill #{billImageReview?.id}
              </Tag>
            </div>

            <ExpenseFormHeaderFields />
          </Card>

          <div className={styles.cardsGrid}>
            <SuggestionCard
              title={'Vendor Suggestion'}
              emptyText={'No vendor suggestion found yet.'}
              rows={[
                ['Display Name', suggestions?.vendor?.displayName],
                ['Company Name', suggestions?.vendor?.companyName],
                ['Matched By', suggestions?.vendor?.matchedBy],
              ]}
            />
            <SuggestionCard
              title={'Expense Account Suggestion'}
              emptyText={'No expense account suggestion found yet.'}
              rows={[
                ['Account', suggestions?.expenseAccount?.name],
                ['Code', suggestions?.expenseAccount?.code],
                ['Type', suggestions?.expenseAccount?.accountType],
                ['Matched Note', suggestions?.expenseAccount?.matchedNote],
              ]}
            />
          </div>

          <Card elevation={Elevation.ONE} className={styles.sectionCard}>
            <div className={styles.sectionHeaderCompact}>
              <h3 className={styles.sectionTitle}>Expense Category</h3>
              <Tag minimal>1 mapped line</Tag>
            </div>
            <ExpenseFormEntriesField
              linesNumber={1}
              landedCost={false}
              autoAddNewLine={false}
            />
          </Card>

          <div className={styles.reviewWorkspace}>
            <div className={styles.notesColumn}>
              <section className={styles.workspaceSection}>
                <div className={styles.workspaceHeading}>
                  <h3 className={styles.sectionTitle}>Description</h3>
                  <p className={styles.workspaceSubtitle}>
                    Keep this blank unless you want to add your own summary.
                  </p>
                </div>
                <FFormGroup name={'description'} className={styles.compactField}>
                  <FTextArea
                    name={'description'}
                    fill
                    growVertically
                    large
                    placeholder={'Description'}
                    className={styles.descriptionInput}
                  />
                </FFormGroup>
              </section>

              <section
                className={`${styles.workspaceSection} ${styles.workspaceSectionMuted}`}
              >
                <div className={styles.workspaceHeading}>
                  <h3 className={styles.sectionTitle}>Internal Notes</h3>
                  <p className={styles.workspaceSubtitle}>
                    Keep the extracted reminder editable here.
                  </p>
                </div>
                <FFormGroup
                  name={'internal_notes'}
                  className={styles.compactField}
                >
                  <FTextArea
                    name={'internal_notes'}
                    fill
                    growVertically
                    large
                    placeholder={'Internal notes'}
                    className={styles.notesInput}
                  />
                </FFormGroup>
              </section>
            </div>

            <section className={styles.totalsPanel}>
              <div className={styles.workspaceHeading}>
                <h3 className={styles.sectionTitle}>Totals & Tax</h3>
                <p className={styles.workspaceSubtitle}>
                  Adjust withholding and sales tax before publishing.
                </p>
              </div>
              <ExpenseFormFooterRight />
            </section>
          </div>
        </div>

        <div className={styles.actionsBar}>
          <ExpenseFloatingFooter />
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({ title, rows, emptyText }) {
  const hasAnyValue = rows.some(([, value]) => Boolean(value));

  return (
    <Card elevation={Elevation.ONE} className={styles.suggestionCard}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {!hasAnyValue ? (
        <p className={styles.emptyText}>{emptyText}</p>
      ) : (
        <div className={styles.keyValueList}>
          {rows.map(([label, value]) => (
            <div className={styles.keyValueRow} key={label}>
              <span className={styles.keyLabel}>{label}</span>
              <span className={styles.keyValue}>{value || '-'}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function BillReviewImageViewer({ imageUrl, fileType }) {
  const history = useHistory();
  const { billImageReview } = useExpenseFormContext();
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const dragStateRef = React.useRef(null);

  React.useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [imageUrl]);

  const updateScale = (nextScale) => {
    setScale(Math.min(4, Math.max(0.5, nextScale)));
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.15 : -0.15;
    updateScale(scale + delta);
  };

  const handlePointerDown = (event) => {
    dragStateRef.current = {
      x: event.clientX,
      y: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragStateRef.current) {
      return;
    }
    const deltaX = event.clientX - dragStateRef.current.x;
    const deltaY = event.clientY - dragStateRef.current.y;

    setOffset({
      x: dragStateRef.current.originX + deltaX,
      y: dragStateRef.current.originY + deltaY,
    });
  };

  const handlePointerUp = (event) => {
    if (!dragStateRef.current) {
      return;
    }
    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleNavigate = (reviewItem) => {
    if (!reviewItem?.id) {
      return;
    }

    history.push(
      `/expenses/new?mode=${reviewItem.mode}&bill_image_id=${reviewItem.id}&bill_review=1`,
    );
  };

  return (
    <Card elevation={Elevation.ONE} className={styles.viewerCard}>
      <div className={styles.viewerToolbar}>
        <div>
          <h2 className={styles.sectionTitle}>Uploaded Bill</h2>
          <p className={styles.sectionSubtitle}>
            Zoom with the mouse wheel and drag to inspect the bill image.
          </p>
        </div>
        <div className={styles.viewerActions}>
          <Button
            small
            minimal
            icon={'arrow-left'}
            disabled={!billImageReview?.previousReview}
            onClick={() => handleNavigate(billImageReview?.previousReview)}
          >
            Previous
          </Button>
          <Button
            small
            minimal
            icon={'arrow-right'}
            disabled={!billImageReview?.nextReview}
            onClick={() => handleNavigate(billImageReview?.nextReview)}
          >
            Next
          </Button>
          <Button small onClick={() => updateScale(scale - 0.15)}>
            Zoom Out
          </Button>
          <Button small onClick={() => updateScale(scale + 0.15)}>
            Zoom In
          </Button>
          <Button small minimal onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      <div
        className={styles.viewerStage}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {imageUrl && fileType === 'pdf' ? (
          <iframe
            src={imageUrl}
            title={'Uploaded bill PDF'}
            className={styles.viewerPdf}
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={'Uploaded bill'}
            draggable={false}
            className={styles.viewerImage}
            style={{
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
          />
        ) : (
          <div className={styles.viewerEmpty}>
            The uploaded bill image is not available.
          </div>
        )}
      </div>
    </Card>
  );
}
