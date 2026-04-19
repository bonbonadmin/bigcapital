import { Inject, Injectable } from '@nestjs/common';
import { omit, sumBy } from 'lodash';
import * as moment from 'moment';
import * as R from 'ramda';
import * as composeAsync from 'async/compose';
import { BranchTransactionDTOTransformer } from '@/modules/Branches/integrations/BranchTransactionDTOTransform';
import { Expense } from '../models/Expense.model';
import { assocItemEntriesDefaultIndex } from '@/utils/associate-item-entries-index';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { CreateExpenseDto, EditExpenseDto } from '../dtos/Expense.dto';
import { WithholdingTax } from '@/modules/WithholdingTaxes/models/WithholdingTax.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

@Injectable()
export class ExpenseDTOTransformer {
  /**
   * @param {BranchTransactionDTOTransformer} branchDTOTransform - Branch transaction DTO transformer.
   * @param {TenancyContext} tenancyContext - Tenancy context.
   */
  constructor(
    private readonly branchDTOTransform: BranchTransactionDTOTransformer,
    private readonly tenancyContext: TenancyContext,

    @Inject(WithholdingTax.name)
    private readonly withholdingTaxModel: TenantModelProxy<typeof WithholdingTax>,
  ) {}

  public resolveWithholdingTaxSnapshot = async (
    expenseDTO: CreateExpenseDto | EditExpenseDto,
  ) => {
    if (!expenseDTO.withholdingTaxId) {
      return null;
    }
    const withholdingTax = await this.withholdingTaxModel()
      .query()
      .findById(expenseDTO.withholdingTaxId)
      .throwIfNotFound();

    const totalAmount = this.getExpenseCategoriesTotal(expenseDTO.categories);
    const rate = Number(withholdingTax.rate) || 0;
    const amount = Number(((totalAmount * rate) / 100).toFixed(3));

    return {
      withholdingTaxId: withholdingTax.id,
      withholdingTaxName: withholdingTax.name,
      withholdingTaxRate: rate,
      withholdingTaxAccountId: withholdingTax.accountId,
      withholdingTaxAmount: amount,
    };
  };

  /**
   * Retrieve the expense landed cost amount.
   * @param  {IExpenseDTO} expenseDTO
   * @return {number}
   */
  private getExpenseLandedCostAmount = (
    expenseDTO: CreateExpenseDto | EditExpenseDto,
  ): number => {
    const landedCostEntries = expenseDTO.categories.filter((entry) => {
      return entry.landedCost === true;
    });
    return this.getExpenseCategoriesTotal(landedCostEntries);
  };

  /**
   * Retrieve the given expense categories total.
   * @param   {IExpenseCategory} categories
   * @returns {number}
   */
  private getExpenseCategoriesTotal = (categories): number => {
    return sumBy(categories, 'amount');
  };

  /**
   * Mapping expense DTO to model.
   * @param {IExpenseDTO} expenseDTO
   * @param {ISystemUser} authorizedUser
   * @return {IExpense}
   */
  private async expenseDTOToModel(
    expenseDTO: CreateExpenseDto | EditExpenseDto,
    withholdingTaxSnapshot = null,
  ): Promise<Expense> {
    const landedCostAmount = this.getExpenseLandedCostAmount(expenseDTO);
    const totalAmount = this.getExpenseCategoriesTotal(expenseDTO.categories);
    const isPayableExpense = Boolean(expenseDTO.payableAccountId);
    const resolvedWithholdingTaxSnapshot =
      withholdingTaxSnapshot ||
      (await this.resolveWithholdingTaxSnapshot(expenseDTO));

    const categories = R.compose(
      // Associate the default index to categories lines.
      assocItemEntriesDefaultIndex,
    )(expenseDTO.categories || []);

    const initialDTO = {
      ...omit(expenseDTO, ['publish', 'attachments']),
      categories,
      totalAmount,
      landedCostAmount,
      paymentAmount: isPayableExpense ? 0 : totalAmount,
      ...(resolvedWithholdingTaxSnapshot || {
        withholdingTaxId: null,
        withholdingTaxName: null,
        withholdingTaxRate: null,
        withholdingTaxAccountId: null,
        withholdingTaxAmount: 0,
      }),
      openedAt:
        isPayableExpense && expenseDTO.publish
          ? moment().toMySqlDateTime()
          : null,
      paymentDate: moment(expenseDTO.paymentDate).toMySqlDateTime(),
      ...(expenseDTO.publish
        ? {
            publishedAt: moment().toMySqlDateTime(),
          }
        : {}),
    };
    const asyncDto = await composeAsync(
      this.branchDTOTransform.transformDTO<Expense>,
    )(initialDTO);

    return asyncDto as Expense;
  }

  /**
   * Transforms the expense create DTO.
   * @param {IExpenseCreateDTO} expenseDTO
   * @returns {Promise<Expense>}
   */
  public expenseCreateDTO = async (
    expenseDTO: CreateExpenseDto | EditExpenseDto,
    withholdingTaxSnapshot = null,
  ): Promise<Partial<Expense>> => {
    const initialDTO = await this.expenseDTOToModel(
      expenseDTO,
      withholdingTaxSnapshot,
    );
    const tenant = await this.tenancyContext.getTenant(true);

    return {
      ...initialDTO,
      currencyCode: expenseDTO.currencyCode || tenant?.metadata?.baseCurrency,
      exchangeRate: expenseDTO.exchangeRate || 1,
      // ...(user
      //   ? {
      //       userId: user.id,
      //     }
      //   : {}),
    };
  };

  /**
   * Transformes the expense edit DTO.
   * @param {EditExpenseDto} expenseDTO
   * @returns {Promise<Expense>}
   */
  public expenseEditDTO = async (
    expenseDTO: EditExpenseDto,
    withholdingTaxSnapshot = null,
  ): Promise<Expense> => {
    return this.expenseDTOToModel(expenseDTO, withholdingTaxSnapshot);
  };
}
