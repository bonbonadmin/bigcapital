import { Inject, Injectable } from '@nestjs/common';
import { ACCOUNT_ROOT_TYPE } from '@/constants/accounts';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { EditWithholdingTaxDto } from '../dtos/WithholdingTax.dto';
import { WithholdingTax } from '../models/WithholdingTax.model';

const ERRORS = {
  ACCOUNT_INVALID_TYPE: 'WITHHOLDING_TAX_ACCOUNT_INVALID_TYPE',
  NOT_FOUND: 'WITHHOLDING_TAX_NOT_FOUND',
};

@Injectable()
export class EditWithholdingTaxService {
  constructor(
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(WithholdingTax.name)
    private readonly withholdingTaxModel: TenantModelProxy<typeof WithholdingTax>,
  ) {}

  private async validateAccount(accountId: number) {
    const account = await this.accountModel().query().findById(accountId).throwIfNotFound();

    if (
      !account.isRootType(ACCOUNT_ROOT_TYPE.ASSET) &&
      !account.isRootType(ACCOUNT_ROOT_TYPE.LIABILITY)
    ) {
      throw new ServiceError(ERRORS.ACCOUNT_INVALID_TYPE);
    }
  }

  public async editWithholdingTax(
    withholdingTaxId: number,
    withholdingTaxDTO: EditWithholdingTaxDto,
  ) {
    const existingWithholdingTax = await this.withholdingTaxModel()
      .query()
      .findById(withholdingTaxId);

    if (!existingWithholdingTax) {
      throw new ServiceError(ERRORS.NOT_FOUND);
    }

    await this.validateAccount(withholdingTaxDTO.accountId);

    return this.withholdingTaxModel()
      .query()
      .patchAndFetchById(withholdingTaxId, withholdingTaxDTO);
  }
}
