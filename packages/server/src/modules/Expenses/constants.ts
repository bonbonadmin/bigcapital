import { ACCOUNT_TYPE } from '@/constants/accounts';

export const DEFAULT_VIEW_COLUMNS = [];
export const ExpenseDefaultViews = [
  {
    name: 'Draft',
    slug: 'draft',
    rolesLogicExpression: '1',
    roles: [
      { index: 1, fieldKey: 'status', comparator: 'equals', value: 'draft' },
    ],
    columns: DEFAULT_VIEW_COLUMNS,
  },
  {
    name: 'Published',
    slug: 'published',
    rolesLogicExpression: '1',
    roles: [
      {
        index: 1,
        fieldKey: 'status',
        comparator: 'equals',
        value: 'published',
      },
    ],
    columns: DEFAULT_VIEW_COLUMNS,
  },
];

export const ERRORS = {
  EXPENSE_NOT_FOUND: 'expense_not_found',
  EXPENSES_NOT_FOUND: 'EXPENSES_NOT_FOUND',
  PAYMENT_ACCOUNT_NOT_FOUND: 'payment_account_not_found',
  PAYABLE_ACCOUNT_NOT_FOUND: 'payable_account_not_found',
  SOME_ACCOUNTS_NOT_FOUND: 'some_expenses_not_found',
  TOTAL_AMOUNT_EQUALS_ZERO: 'total_amount_equals_zero',
  PAYMENT_ACCOUNT_HAS_INVALID_TYPE: 'payment_account_has_invalid_type',
  PAYABLE_ACCOUNT_HAS_INVALID_TYPE: 'payable_account_has_invalid_type',
  EXPENSES_ACCOUNT_HAS_INVALID_TYPE: 'expenses_account_has_invalid_type',
  EXPENSE_ALREADY_PUBLISHED: 'expense_already_published',
  EXPENSE_HAS_ASSOCIATED_LANDED_COST: 'EXPENSE_HAS_ASSOCIATED_LANDED_COST',
  EXPENSE_HAS_ASSOCIATED_PAYMENTS: 'EXPENSE_HAS_ASSOCIATED_PAYMENTS',
  EXPENSE_PAYABLE_VENDOR_REQUIRED: 'EXPENSE_PAYABLE_VENDOR_REQUIRED',
  EXPENSE_PAYMENT_TOTAL_EXCEEDS_AMOUNT: 'EXPENSE_PAYMENT_TOTAL_EXCEEDS_AMOUNT',
  WITHHOLDING_TAX_ONLY_SUPPORTED_FOR_PAYABLE_EXPENSES:
    'WITHHOLDING_TAX_ONLY_SUPPORTED_FOR_PAYABLE_EXPENSES',
  WITHHOLDING_TAX_ACCOUNT_HAS_INVALID_TYPE:
    'WITHHOLDING_TAX_ACCOUNT_HAS_INVALID_TYPE',
  SALES_TAX_ONLY_SUPPORTED_FOR_PAYABLE_EXPENSES:
    'SALES_TAX_ONLY_SUPPORTED_FOR_PAYABLE_EXPENSES',
  SALES_TAX_ACCOUNT_HAS_INVALID_TYPE: 'SALES_TAX_ACCOUNT_HAS_INVALID_TYPE',
  EXPENSE_WITHHOLDING_TAX_SHOULD_NOT_MODIFY:
    'EXPENSE_WITHHOLDING_TAX_SHOULD_NOT_MODIFY',
  EXPENSE_SALES_TAX_SHOULD_NOT_MODIFY: 'EXPENSE_SALES_TAX_SHOULD_NOT_MODIFY',
  EXPENSE_PAYABLE_ACCOUNT_SHOULD_NOT_MODIFY:
    'EXPENSE_PAYABLE_ACCOUNT_SHOULD_NOT_MODIFY',
  EXPENSE_PAYEE_SHOULD_NOT_MODIFY: 'EXPENSE_PAYEE_SHOULD_NOT_MODIFY',
};

export const ExpensesSampleData = [
  {
    'Payment Date': '2024-03-01',
    'Reference No.': 'REF-1',
    'Payment Account': 'Petty Cash',
    Description: 'Vel et dolorem architecto veniam.',
    'Currency Code': '',
    'Exchange Rate': '',
    'Expense Account': 'Utilities Expense',
    Amount: 9000,
    'Line Description': 'Voluptates voluptas corporis vel.',
    Publish: 'T',
  },
  {
    'Payment Date': '2024-03-02',
    'Reference No.': 'REF-2',
    'Payment Account': 'Petty Cash',
    Description: 'Id est molestias.',
    'Currency Code': '',
    'Exchange Rate': '',
    'Expense Account': 'Utilities Expense',
    Amount: 9000,
    'Line Description': 'Eos voluptatem cumque et voluptate reiciendis.',
    Publish: 'T',
  },
  {
    'Payment Date': '2024-03-03',
    'Reference No.': 'REF-3',
    'Payment Account': 'Petty Cash',
    Description: 'Quam cupiditate at nihil dicta dignissimos non fugit illo.',
    'Currency Code': '',
    'Exchange Rate': '',
    'Expense Account': 'Utilities Expense',
    Amount: 9000,
    'Line Description':
      'Hic alias rerum sed commodi dolores sint animi perferendis.',
    Publish: 'T',
  },
];

export const SUPPORTED_EXPENSE_PAYMENT_ACCOUNT_TYPES = [
  ACCOUNT_TYPE.CASH,
  ACCOUNT_TYPE.BANK,
  ACCOUNT_TYPE.CREDIT_CARD,
  ACCOUNT_TYPE.OTHER_CURRENT_ASSET,
  ACCOUNT_TYPE.NON_CURRENT_ASSET,
  ACCOUNT_TYPE.FIXED_ASSET,
];

export const SUPPORTED_EXPENSE_PAYABLE_ACCOUNT_TYPES = [
  ACCOUNT_TYPE.ACCOUNTS_PAYABLE,
];
