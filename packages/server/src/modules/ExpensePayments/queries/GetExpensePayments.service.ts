import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ExpensePayment } from '../models/ExpensePayment';
import { GetExpensePaymentsFilterDto } from '../dtos/GetExpensePaymentsFilter.dto';

const SORT_FIELDS = {
  paymentDate: 'payment_date',
  payment_date: 'payment_date',
  paymentNumber: 'payment_number',
  payment_number: 'payment_number',
  amount: 'amount',
  reference: 'reference',
  createdAt: 'created_at',
  created_at: 'created_at',
};

@Injectable()
export class GetExpensePaymentsService {
  constructor(
    @Inject(ExpensePayment.name)
    private readonly expensePaymentModel: TenantModelProxy<typeof ExpensePayment>,
  ) {}

  public async getExpensePayments(filterDTO: GetExpensePaymentsFilterDto) {
    const page = filterDTO.page || 1;
    const pageSize = filterDTO.pageSize || 12;
    const sortField =
      SORT_FIELDS[filterDTO.columnSortBy] || SORT_FIELDS.created_at;
    const sortOrder = filterDTO.sortOrder || 'desc';

    const query = this.expensePaymentModel()
      .query()
      .withGraphFetched('vendor')
      .withGraphFetched('paymentAccount')
      .withGraphFetched('payableAccount')
      .orderBy(sortField, sortOrder);

    if (filterDTO.searchKeyword) {
      query.where((builder) => {
        builder
          .where('payment_number', 'like', `%${filterDTO.searchKeyword}%`)
          .orWhere('reference', 'like', `%${filterDTO.searchKeyword}%`);
      });
    }

    const { results, pagination } = await query.pagination(page - 1, pageSize);

    return {
      expensePayments: results,
      pagination,
    };
  }
}
