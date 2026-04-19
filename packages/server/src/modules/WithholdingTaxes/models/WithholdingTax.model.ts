import { Model } from 'objection';
import { BaseModel } from '@/models/Model';
import { ExportableModel } from '@/modules/Export/decorators/ExportableModel.decorator';

@ExportableModel()
export class WithholdingTax extends BaseModel {
  name!: string;
  rate!: number;
  description?: string;
  accountId!: number;

  static get tableName() {
    return 'withholding_taxes';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const { Account } = require('../../Accounts/models/Account.model');

    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: 'withholding_taxes.accountId',
          to: 'accounts.id',
        },
      },
    };
  }
}
