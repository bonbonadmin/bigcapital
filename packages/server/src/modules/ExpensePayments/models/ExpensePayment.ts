import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';
import { Vendor } from '@/modules/Vendors/models/Vendor';
import type { Account } from '@/modules/Accounts/models/Account.model';
import { ExpensePaymentEntry } from './ExpensePaymentEntry';
import { Document } from '@/modules/ChromiumlyTenancy/models/Document';
import { InjectAttachable } from '@/modules/Attachments/decorators/InjectAttachable.decorator';

@InjectAttachable()
export class ExpensePayment extends TenantBaseModel {
  vendorId: number;
  amount: number;
  currencyCode: string;
  paymentAccountId: number;
  payableAccountId: number | null;
  paymentNumber?: string;
  paymentDate: string;
  reference?: string;
  userId: number;
  statement?: string;
  exchangeRate: number;
  branchId?: number;
  createdAt?: Date;
  updatedAt?: Date;

  entries?: ExpensePaymentEntry[];
  vendor?: Vendor;
  paymentAccount?: Account;
  payableAccount?: Account;
  attachments?: Document[];

  static get tableName() {
    return 'expense_payments';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get virtualAttributes() {
    return ['localAmount'];
  }

  get localAmount() {
    return this.amount * this.exchangeRate;
  }

  static get relationMappings() {
    const { ExpensePaymentEntry } = require('./ExpensePaymentEntry');
    const { Vendor } = require('../../Vendors/models/Vendor');
    const { Account } = require('../../Accounts/models/Account.model');
    const { Branch } = require('../../Branches/models/Branch.model');
    const { Document } = require('../../ChromiumlyTenancy/models/Document');

    return {
      entries: {
        relation: Model.HasManyRelation,
        modelClass: ExpensePaymentEntry,
        join: {
          from: 'expense_payments.id',
          to: 'expense_payments_entries.expensePaymentId',
        },
        filter: (query) => {
          query.orderBy('index', 'ASC');
        },
      },

      vendor: {
        relation: Model.BelongsToOneRelation,
        modelClass: Vendor,
        join: {
          from: 'expense_payments.vendorId',
          to: 'contacts.id',
        },
        filter(query) {
          query.where('contact_service', 'vendor');
        },
      },

      paymentAccount: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: 'expense_payments.paymentAccountId',
          to: 'accounts.id',
        },
      },

      payableAccount: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: 'expense_payments.payableAccountId',
          to: 'accounts.id',
        },
      },

      branch: {
        relation: Model.BelongsToOneRelation,
        modelClass: Branch,
        join: {
          from: 'expense_payments.branchId',
          to: 'branches.id',
        },
      },

      attachments: {
        relation: Model.ManyToManyRelation,
        modelClass: Document,
        join: {
          from: 'expense_payments.id',
          through: {
            from: 'document_links.modelId',
            to: 'document_links.documentId',
          },
          to: 'documents.id',
        },
        filter(query) {
          query.where('model_ref', 'ExpensePayment');
        },
      },
    };
  }
}
