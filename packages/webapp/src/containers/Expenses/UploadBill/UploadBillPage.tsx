// @ts-nocheck
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  Button,
  Card,
  Elevation,
  Intent,
  Tag,
} from '@blueprintjs/core';
import {
  AppToaster,
  DashboardInsider,
  Icon,
  ListSelect,
} from '@/components';
import { Dropzone } from '@/components/Dropzone';
import { IMAGE_MIME_TYPE, PDF_MIME_TYPE } from '@/components/Dropzone/mine-types';
import { ACCOUNT_TYPE } from '@/constants/accountTypes';
import {
  useAccounts,
  useBillImageSummary,
  useNextBillImageReview,
  useProcessBillImageMap,
  useUploadBillImage,
} from '@/hooks/query';
import { formatBytes } from '@/utils/format-bytes';
import { nestedArrayToflatten } from '@/utils';
import styles from './UploadBillPage.module.scss';

const MAX_FILES = 50;
const MAX_FILE_SIZE = 25 * 1024 ** 2;
const BILL_UPLOAD_MIME_TYPES = [...IMAGE_MIME_TYPE, ...PDF_MIME_TYPE];

const createQueuedFile = (file) => ({
  id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
  file,
  previewUrl: URL.createObjectURL(file),
});

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.errors?.[0]?.message ||
  error?.message ||
  'The bill file upload failed.';

export default function UploadBillPage() {
  const history = useHistory();
  const openRef = React.useRef<() => void>(null);
  const selectedFilesRef = React.useRef([]);

  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [uploadedEntries, setUploadedEntries] = React.useState([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = React.useState(null);
  const [selectedApId, setSelectedApId] = React.useState(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(null);

  const { data: accounts = [], isLoading: isAccountsLoading } = useAccounts();
  const { data: billImageSummary } = useBillImageSummary({
    refetchInterval: 10000,
  });
  const { mutateAsync: uploadBillImage } = useUploadBillImage();
  const {
    mutateAsync: processBillImageMap,
    isLoading: isProcessingBillImageMap,
  } = useProcessBillImageMap();
  const {
    mutateAsync: fetchNextBillImageReview,
    isLoading: isLoadingNextBillReview,
  } = useNextBillImageReview();

  React.useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  React.useEffect(
    () => () => {
      selectedFilesRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
      });
    },
    [],
  );

  React.useEffect(() => {
    if (selectedBankAccountId) {
      setSelectedApId(null);
    }
  }, [selectedBankAccountId]);

  const flattenedAccounts = React.useMemo(
    () => nestedArrayToflatten(accounts || []),
    [accounts],
  );

  const bankAccounts = React.useMemo(
    () =>
      flattenedAccounts.filter(
        (account) =>
          (account.account_type || account.accountType) === ACCOUNT_TYPE.BANK &&
          account.active !== false,
      ),
    [flattenedAccounts],
  );

  const payableAccounts = React.useMemo(
    () =>
      flattenedAccounts.filter(
        (account) =>
          (account.account_type || account.accountType) ===
            ACCOUNT_TYPE.ACCOUNTS_PAYABLE && account.active !== false,
      ),
    [flattenedAccounts],
  );

  const revokeFiles = React.useCallback((filesToRevoke) => {
    filesToRevoke.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
    });
  }, []);

  const appendFiles = React.useCallback(
    (files) => {
      if (!files?.length) {
        return;
      }

      const remainingSlots = MAX_FILES - selectedFilesRef.current.length;

      if (remainingSlots <= 0) {
        AppToaster.show({
          intent: Intent.WARNING,
          message: `You can upload up to ${MAX_FILES} bill files at a time.`,
        });
        return;
      }

      const acceptedFiles = files.slice(0, remainingSlots).map(createQueuedFile);

      if (files.length > remainingSlots) {
        AppToaster.show({
          intent: Intent.WARNING,
          message: `Only the first ${remainingSlots} file(s) were added. The maximum is ${MAX_FILES}.`,
        });
      }

      setSelectedFiles((currentFiles) => [...currentFiles, ...acceptedFiles]);
    },
    [setSelectedFiles],
  );

  const handleRemoveSelectedFile = React.useCallback(
    (queuedFileId) => {
      setSelectedFiles((currentFiles) => {
        const fileToRemove = currentFiles.find((item) => item.id === queuedFileId);

        if (fileToRemove) {
          revokeFiles([fileToRemove]);
        }

        return currentFiles.filter((item) => item.id !== queuedFileId);
      });
    },
    [revokeFiles],
  );

  const handleClearSelectedFiles = React.useCallback(() => {
    setSelectedFiles((currentFiles) => {
      revokeFiles(currentFiles);
      return [];
    });
  }, [revokeFiles]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      AppToaster.show({
        intent: Intent.WARNING,
        message: 'Select at least one bill file before uploading.',
      });
      return;
    }
    if (!selectedBankAccountId && !selectedApId) {
      AppToaster.show({
        intent: Intent.WARNING,
        message:
          'Choose a bank account or, if none is selected, choose an accounts payable account.',
      });
      return;
    }

    setIsUploading(true);

    const successes = [];
    const failures = [];

    for (const [index, queuedFile] of selectedFiles.entries()) {
      setUploadProgress({
        current: index + 1,
        total: selectedFiles.length,
        name: queuedFile.file.name,
      });

      const formData = new FormData();
      formData.append('file', queuedFile.file);

      if (selectedBankAccountId) {
        formData.append('bankAccountId', String(selectedBankAccountId));
      }
      if (!selectedBankAccountId && selectedApId) {
        formData.append('apId', String(selectedApId));
      }

      try {
        const entry = await uploadBillImage(formData);

        successes.push({
          queueId: queuedFile.id,
          queuedFile,
          entry: {
            ...entry,
            originName: queuedFile.file.name,
          },
        });
      } catch (error) {
        failures.push({
          queueId: queuedFile.id,
          message: getErrorMessage(error),
        });
      }
    }

    setUploadedEntries((currentEntries) => [
      ...successes.map((success) => success.entry),
      ...currentEntries,
    ]);

    if (successes.length > 0) {
      const successIds = new Set(successes.map((success) => success.queueId));

      setSelectedFiles((currentFiles) => {
        const succeededFiles = currentFiles.filter((item) =>
          successIds.has(item.id),
        );
        revokeFiles(succeededFiles);

        return currentFiles.filter((item) => !successIds.has(item.id));
      });
    }

    setUploadProgress(null);
    setIsUploading(false);

    if (successes.length > 0 && failures.length === 0) {
      AppToaster.show({
        intent: Intent.SUCCESS,
        message: `${successes.length} bill file(s) uploaded successfully.`,
      });
      return;
    }

    if (successes.length > 0 && failures.length > 0) {
      AppToaster.show({
        intent: Intent.WARNING,
        message: `${successes.length} bill file(s) uploaded and ${failures.length} failed. ${failures[0].message}`,
      });
      return;
    }

    AppToaster.show({
      intent: Intent.DANGER,
      message: failures[0]?.message || 'The bill file upload failed.',
    });
  };

  const canUpload =
    selectedFiles.length > 0 &&
    (selectedBankAccountId || selectedApId) &&
    !isUploading;
  const mapPendingCount = billImageSummary?.mapPendingCount ?? 0;
  const reviewPendingCount = billImageSummary?.reviewPendingCount ?? 0;

  const handleProcessBillMap = async () => {
    try {
      const response = await processBillImageMap();

      AppToaster.show({
        intent: Intent.SUCCESS,
        message: response?.queued
          ? 'Bill Map queued. OCR and mapping will continue in the background.'
          : 'Bill Map started successfully.',
      });
    } catch (error) {
      AppToaster.show({
        intent: Intent.DANGER,
        message:
          getErrorMessage(error) || 'Bill Map could not be started right now.',
      });
    }
  };

  const handleOpenBillReview = async () => {
    try {
      const reviewItem = await fetchNextBillImageReview();

      if (!reviewItem?.id) {
        AppToaster.show({
          intent: Intent.WARNING,
          message: 'There are no mapped bill images waiting for review.',
        });
        return;
      }

      history.push(
        `/expenses/new?mode=${reviewItem.mode}&bill_image_id=${reviewItem.id}&bill_review=1`,
      );
    } catch (error) {
      AppToaster.show({
        intent: Intent.DANGER,
        message:
          getErrorMessage(error) ||
          'The next bill review item could not be opened right now.',
      });
    }
  };

  return (
    <DashboardInsider loading={isAccountsLoading} name={'upload-bill-page'}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Upload Bill</h1>
            <p className={styles.subtitle}>
              Upload your bill for automatic account mapping
            </p>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.headerActionButton}>
              <Button
                intent={Intent.PRIMARY}
                outlined
                onClick={handleProcessBillMap}
                disabled={mapPendingCount === 0 || isProcessingBillImageMap}
                loading={isProcessingBillImageMap}
              >
                Bill Map
              </Button>
              <span className={styles.headerActionBadge}>{mapPendingCount}</span>
            </div>

            <div className={styles.headerActionButton}>
              <Button
                onClick={handleOpenBillReview}
                loading={isLoadingNextBillReview}
                disabled={reviewPendingCount === 0 || isLoadingNextBillReview}
              >
                Bill Review
              </Button>
              <span className={styles.headerActionBadge}>
                {reviewPendingCount}
              </span>
            </div>
          </div>
        </div>

        <Card className={styles.card} elevation={Elevation.ONE}>
          <div className={styles.fieldStack}>
            <div>
              <label className={styles.fieldLabel}>Bank Account</label>
              <ListSelect
                key={`bank-account-${selectedBankAccountId ?? 'none'}`}
                items={bankAccounts}
                textProp={'name'}
                labelProp={'code'}
                selectedItem={selectedBankAccountId}
                defaultText={'Choose a bank account (optional)'}
                onItemSelect={(item) => setSelectedBankAccountId(item?.id ?? null)}
                noResultsText={'No bank accounts found'}
                disabled={isUploading}
                className={styles.accountSelect}
              />
              {selectedBankAccountId ? (
                <div className={styles.helperText}>
                  This upload will be linked to the selected bank account.
                </div>
              ) : (
                <div className={styles.helperText}>
                  Leave this empty if you want to classify the bill under
                  accounts payable instead.
                </div>
              )}
              {selectedBankAccountId && (
                <div className={styles.helperActions}>
                  <Button
                    small
                    minimal
                    onClick={() => setSelectedBankAccountId(null)}
                    disabled={isUploading}
                  >
                    Clear bank account
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label className={styles.fieldLabel}>Accounts Payable</label>
              <ListSelect
                key={`ap-account-${selectedApId ?? 'none'}-${selectedBankAccountId ?? 'no-bank'}`}
                items={payableAccounts}
                textProp={'name'}
                labelProp={'code'}
                selectedItem={selectedApId}
                defaultText={
                  selectedBankAccountId
                    ? 'Not required while a bank account is selected'
                    : 'Choose an accounts payable account'
                }
                onItemSelect={(item) => setSelectedApId(item?.id ?? null)}
                noResultsText={'No accounts payable accounts found'}
                disabled={isUploading || !!selectedBankAccountId}
                className={styles.accountSelect}
              />
              <div className={styles.helperText}>
                {!selectedBankAccountId
                  ? 'Required when no bank account is selected.'
                  : 'Disabled because the selected bank account already determines the upload target.'}
              </div>
              {!selectedBankAccountId && selectedApId && (
                <div className={styles.helperActions}>
                  <Button
                    small
                    minimal
                    onClick={() => setSelectedApId(null)}
                    disabled={isUploading}
                  >
                    Clear accounts payable
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className={styles.card} elevation={Elevation.ONE}>
          <h2 className={styles.cardTitle}>Bill Files</h2>
          <p className={styles.cardHint}>
            Supported files: images and PDFs up to 25MB each. You can add files
            in multiple batches until you reach the {MAX_FILES}-file limit.
          </p>

          <Dropzone
            onDrop={appendFiles}
            onReject={() =>
              AppToaster.show({
                intent: Intent.DANGER,
                message: 'Only image or PDF files up to 25MB are supported.',
              })
            }
            accept={BILL_UPLOAD_MIME_TYPES}
            maxSize={MAX_FILE_SIZE}
            maxFiles={MAX_FILES}
            multiple
            activateOnClick={false}
            openRef={openRef}
            classNames={{
              root: styles.dropzoneRoot,
              content: styles.dropzoneContent,
            }}
            disabled={isUploading}
          >
            <Icon icon={'upload'} iconSize={28} />
            <h3 className={styles.dropzoneTitle}>Drop bill files here</h3>
            <p className={styles.dropzoneSubtitle}>
              Or choose files from your computer and upload them when you are
              ready.
            </p>
            <div className={styles.dropzoneActions}>
              <Button
                onClick={() => openRef.current?.()}
                outlined
                disabled={isUploading}
              >
                Choose Files
              </Button>
            </div>
          </Dropzone>

          {selectedFiles.length > 0 && (
            <>
              <div className={styles.selectionHeader}>
                <div className={styles.selectionMeta}>
                  {selectedFiles.length} of {MAX_FILES} file(s) selected
                </div>

                <Button
                  minimal
                  intent={Intent.DANGER}
                  onClick={handleClearSelectedFiles}
                  disabled={isUploading}
                >
                  Clear Selection
                </Button>
              </div>

              <div className={styles.fileGrid}>
                {selectedFiles.map((queuedFile) => (
                  <div className={styles.fileCard} key={queuedFile.id}>
                    {queuedFile.file.type === 'application/pdf' ? (
                      <div className={styles.filePreview}>
                        <Icon icon={'document'} iconSize={40} />
                      </div>
                    ) : (
                      <img
                        src={queuedFile.previewUrl}
                        alt={queuedFile.file.name}
                        className={styles.filePreview}
                      />
                    )}

                    <div className={styles.fileBody}>
                      <p className={styles.fileName}>{queuedFile.file.name}</p>
                      <p className={styles.fileMeta}>
                        {formatBytes(queuedFile.file.size)}
                      </p>

                      <div className={styles.fileActions}>
                        <Button
                          small
                          minimal
                          intent={Intent.DANGER}
                          onClick={() => handleRemoveSelectedFile(queuedFile.id)}
                          disabled={isUploading}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={styles.footer}>
            <div className={styles.footerText}>
              {uploadProgress
                ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}: ${uploadProgress.name}`
                : 'Uploads start only when you click the upload button.'}
            </div>

            <Button
              intent={Intent.PRIMARY}
              onClick={handleUpload}
              disabled={!canUpload}
              loading={isUploading}
            >
              Upload Bill Images
            </Button>
          </div>
        </Card>

        {uploadedEntries.length > 0 && (
          <Card className={styles.card} elevation={Elevation.ONE}>
            <h2 className={styles.cardTitle}>Recent Uploads</h2>
            <p className={styles.cardHint}>
              Newly uploaded bill files are queued with pending OCR, mapping,
              and publish statuses.
            </p>

            <div className={styles.uploadedList}>
              {uploadedEntries.map((entry) => (
                <div className={styles.uploadedItem} key={`${entry.id}-${entry.s3Link}`}>
                  <div>
                    <p className={styles.uploadedName}>{entry.originName}</p>
                    <span className={styles.uploadedLink}>{entry.s3Link}</span>
                  </div>

                  <div className={styles.statusGroup}>
                    <Tag minimal>OCR: {entry.ocrStatus}</Tag>
                    <Tag minimal>Mapping: {entry.mappingStatus}</Tag>
                    <Tag minimal>Publish: {entry.publishStatus}</Tag>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardInsider>
  );
}
