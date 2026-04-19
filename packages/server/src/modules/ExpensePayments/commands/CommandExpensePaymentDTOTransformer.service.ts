import { Injectable } from '@nestjs/common';
import * as R from 'ramda';
import { omit, sumBy } from 'lodash';
import { formatDateFields } from '@/utils/format-date-fields';
import { assocItemEntriesDefaultIndex } from '@/utils/associate-item-entries-index';
import { BranchTransactionDTOTransformer } from '@/modules/Branches/integrations/BranchTransactionDTOTransform';
import { Vendor } from '@/modules/Vendors/models/Vendor';
import { ExpensePayment } from '../models/ExpensePayment';
import {
  CreateExpensePaymentDto,
  EditExpensePaymentDto,
} from '../dtos/ExpensePayment.dto';

@Injectable()
export class CommandExpensePaymentDTOTransformer {
  constructor(
    private readonly branchDTOTransform: BranchTransactionDTOTransformer,
  ) {}

  public async transformDTOToModel(
    paymentDTO: CreateExpensePaymentDto | EditExpensePaymentDto,
    vendor: Vendor,
    payableAccountId: number | null,
    currencyCode: string | null,
  ): Promise<ExpensePayment> {
    const amount =
      paymentDTO.amount ?? sumBy(paymentDTO.entries, 'paymentAmount');
    const entries = R.compose(assocItemEntriesDefaultIndex)(paymentDTO.entries);

    const initialDTO = {
      ...formatDateFields(omit(paymentDTO, []), ['paymentDate']),
      amount,
      currencyCode: currencyCode || vendor.currencyCode,
      exchangeRate: paymentDTO.exchangeRate || 1,
      payableAccountId,
      entries,
    };
    return R.compose(this.branchDTOTransform.transformDTO<ExpensePayment>)(
      initialDTO,
    );
  }
}
