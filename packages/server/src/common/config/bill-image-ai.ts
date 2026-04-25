import { registerAs } from '@nestjs/config';

const toInteger = (value: string | undefined, fallback: number) => {
  const parsed = parseInt(value || '', 10);

  return Number.isFinite(parsed) ? parsed : fallback;
};

export default registerAs('billImageAi', () => ({
  runpodApiKey:
    process.env.BILL_IMAGE_RUNPOD_API_KEY || process.env.RUNPOD_API_KEY,
  runpodEndpointId:
    process.env.BILL_IMAGE_RUNPOD_ENDPOINT_ID ||
    process.env.RUNPOD_ENDPOINT_ID ||
    process.env.ENDPOINT_ID,
  runpodModel:
    process.env.BILL_IMAGE_RUNPOD_MODEL ||
    process.env.RUNPOD_MODEL ||
    process.env.MODEL ||
    'gemma3:27b',
  parseModel:
    process.env.BILL_IMAGE_OPENAI_PARSE_MODEL || 'gpt-5.4-mini',
  journalModel:
    process.env.BILL_IMAGE_OPENAI_JOURNAL_MODEL || 'gpt-5.4',
  fetchBatchSize: toInteger(
    process.env.BILL_IMAGE_PROCESS_FETCH_BATCH_SIZE,
    25,
  ),
  vendorMatchLimit: toInteger(process.env.BILL_IMAGE_VENDOR_MATCH_LIMIT, 10),
  transactionMatchLimit: toInteger(
    process.env.BILL_IMAGE_TRANSACTION_MATCH_LIMIT,
    15,
  ),
  pollIntervalMs: toInteger(process.env.BILL_IMAGE_RUNPOD_POLL_INTERVAL_MS, 1500),
  requestTimeoutMs: toInteger(
    process.env.BILL_IMAGE_RUNPOD_REQUEST_TIMEOUT_MS,
    120000,
  ),
}));
