import { ACCOUNT_TYPE } from '@/constants/accounts';

export const BILL_IMAGE_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export const BILL_IMAGES_QUEUE = 'BILL_IMAGES_QUEUE';

export enum BillImagesJobName {
  ProcessPendingMap = 'PROCESS_PENDING_BILL_IMAGE_MAP',
}

export const ERRORS = {
  FILE_REQUIRED: 'bill_image_file_required',
  FILE_INVALID_TYPE: 'bill_image_file_invalid_type',
  ACCOUNT_OR_AP_REQUIRED: 'bill_image_account_or_ap_required',
  BANK_ACCOUNT_NOT_FOUND: 'bill_image_bank_account_not_found',
  BANK_ACCOUNT_INVALID_TYPE: 'bill_image_bank_account_invalid_type',
  AP_ACCOUNT_NOT_FOUND: 'bill_image_ap_account_not_found',
  AP_ACCOUNT_INVALID_TYPE: 'bill_image_ap_account_invalid_type',
} as const;

export const SUPPORTED_BANK_ACCOUNT_TYPES = [ACCOUNT_TYPE.BANK];
export const SUPPORTED_AP_ACCOUNT_TYPES = [ACCOUNT_TYPE.ACCOUNTS_PAYABLE];
export const SUPPORTED_EXPENSE_ACCOUNT_TYPES = [
  ACCOUNT_TYPE.EXPENSE,
  ACCOUNT_TYPE.OTHER_EXPENSE,
  ACCOUNT_TYPE.COST_OF_GOODS_SOLD,
];

export const BILL_IMAGE_OCR_PROMPT = `
Extract all readable OCR text from this bill image.

Rules:
- Return plain text only.
- Preserve line breaks where possible.
- Include stamped text, overprint text, and faint text when readable.
- Pay special attention to stamps or chops because they may contain the vendor name.
- Do not add explanations, markdown, or JSON.
- If some text is unclear, transcribe only what is reasonably visible.
`.trim();

export const BILL_IMAGE_PARSE_PROMPT = `
You are an OCR bill parser.

Convert raw OCR bill text into structured JSON.

Rules:
- Return only data supported by the OCR text.
- If a field is missing or unclear, use null.
- Vendor names may appear inside a stamp or chop on the bill; use stamped merchant text when it is the clearest vendor identity.
- If the document is a card slip or payment receipt, do not treat the bank, card network, payment gateway, or EDC provider as the vendor unless they are clearly the merchant that sold the goods or services.
- For card receipts, prefer the merchant or service provider as vendor.
- Normalize dates to YYYY-MM-DD when the day and month are clear.
- If the year is missing or unclear but day and month are clear, use the current year.
- If the month is unclear, use null.
- Keep numeric totals as numbers without currency symbols or separators.
- Extract line items when visible; otherwise use an empty array.
- Put leftover useful context into notes.
`.trim();

export const BILL_IMAGE_ACCOUNT_MAPPING_PROMPT = `
You are an accounting bill-mapping engine for a seafood procurement and manufacturing company.

Goal:
- Choose the best existing vendor match when possible.
- Choose the best expense account for the bill.
- Use the parsed bill, OCR text, vector-based history evidence, candidate vendor matches, candidate expense accounts, and web search when needed.

Rules:
- Never invent vendor IDs or account IDs.
- Prefer existing vendor candidates when they are a strong match.
- If no candidate vendor is strong enough, leave the vendor selection empty.
- Use web search when vendor business type is unclear and knowing the vendor would help choose the right expense account.
- Prefer historical consistency when the evidence is strong.
- Use concise notes.
- Return structured JSON only.
`.trim();
