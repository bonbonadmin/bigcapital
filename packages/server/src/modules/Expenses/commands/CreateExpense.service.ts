import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import {
  IExpenseCreatedPayload,
  IExpenseCreatingPayload,
} from '../interfaces/Expenses.interface';
import { CommandExpenseValidator } from './CommandExpenseValidator.service';
import { ExpenseDTOTransformer } from './CommandExpenseDTO.transformer';
import { Account } from '@/modules/Accounts/models/Account.model';
import { Expense } from '@/modules/Expenses/models/Expense.model';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { events } from '@/common/events/events';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CreateExpenseDto } from '../dtos/Expense.dto';
import { Vendor } from '@/modules/Vendors/models/Vendor';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../constants';
import { WithholdingTax } from '@/modules/WithholdingTaxes/models/WithholdingTax.model';

@Injectable()
export class CreateExpense {
  /**
   * @param {EventEmitter2} eventEmitter - Event emitter.
   * @param {UnitOfWork} uow - Unit of work.
   * @param {CommandExpenseValidator} validator - Command expense validator.
   * @param {ExpenseDTOTransformer} transformDTO - Expense DTO transformer.
   * @param {typeof Account} accountModel - Account model.
   * @param {typeof Expense} expenseModel - Expense model.
   */
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly uow: UnitOfWork,
    private readonly validator: CommandExpenseValidator,
    private readonly transformDTO: ExpenseDTOTransformer,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(Vendor.name)
    private readonly vendorModel: TenantModelProxy<typeof Vendor>,

    @Inject(WithholdingTax.name)
    private readonly withholdingTaxModel: TenantModelProxy<typeof WithholdingTax>,

    @Inject(Expense.name)
    private readonly expenseModel: TenantModelProxy<typeof Expense>,
  ) {}

  /**
   * Authorize before create a new expense transaction.
   * @param {IExpenseDTO} expenseDTO
   */
  private authorize = async (expenseDTO: CreateExpenseDto, withholdingTaxSnapshot) => {
    if (expenseDTO.payeeId) {
      await this.vendorModel()
        .query()
        .findById(expenseDTO.payeeId)
        .throwIfNotFound();
    }

    this.validator.validatePayableExpenseVendor(
      expenseDTO.payableAccountId,
      expenseDTO.payeeId,
    );
    this.validator.validateWithholdingTaxExpense(
      expenseDTO.payableAccountId,
      withholdingTaxSnapshot?.withholdingTaxId,
    );

    if (expenseDTO.paymentAccountId) {
      const paymentAccount = await this.accountModel()
        .query()
        .findById(expenseDTO.paymentAccountId)
        .throwIfNotFound();

      this.validator.validatePaymentAccountType(paymentAccount);
    } else if (!expenseDTO.payableAccountId) {
      throw new ServiceError(ERRORS.PAYMENT_ACCOUNT_NOT_FOUND);
    }

    if (expenseDTO.payableAccountId) {
      const payableAccount = await this.accountModel()
        .query()
        .findById(expenseDTO.payableAccountId)
        .throwIfNotFound();

      this.validator.validatePayableAccountType(payableAccount);
    }

    if (withholdingTaxSnapshot?.withholdingTaxId) {
      const withholdingTax = await this.withholdingTaxModel()
        .query()
        .findById(withholdingTaxSnapshot.withholdingTaxId)
        .throwIfNotFound();
      const withholdingTaxAccount = await this.accountModel()
        .query()
        .findById(withholdingTax.accountId)
        .throwIfNotFound();

      this.validator.validateWithholdingTaxAccountType(withholdingTaxAccount);
    }

    // Retrieves the DTO expense accounts ids.
    const DTOExpenseAccountsIds = expenseDTO.categories.map(
      (category) => category.expenseAccountId,
    );
    // Retrieves the expenses accounts.
    const expenseAccounts = await this.accountModel()
      .query()
      .whereIn('id', DTOExpenseAccountsIds);
    // Validate expense accounts exist on the storage.
    this.validator.validateExpensesAccountsExistance(
      expenseAccounts,
      DTOExpenseAccountsIds,
    );
    // Validate expenses accounts type.
    this.validator.validateExpensesAccountsType(expenseAccounts);

    // Validate the given expense categories not equal zero.
    this.validator.validateCategoriesNotEqualZero(expenseDTO);
  };

  /**
   * Precedures.
   * ---------
   * 1. Validate payment account existance on the storage.
   * 2. Validate expense accounts exist on the storage.
   * 3. Validate payment account type.
   * 4. Validate expenses accounts type.
   * 5. Validate the expense payee contact id existance on storage.
   * 6. Validate the given expense categories not equal zero.
   * 7. Stores the expense to the storage.
   * ---------
   * @param {number} tenantId
   * @param {IExpenseDTO} expenseDTO
   */
  public newExpense = async (
    expenseDTO: CreateExpenseDto,
    trx?: Knex.Transaction,
  ): Promise<Expense> => {
    const withholdingTaxSnapshot =
      await this.transformDTO.resolveWithholdingTaxSnapshot(expenseDTO);

    // Authorize before create a new expense.
    await this.authorize(expenseDTO, withholdingTaxSnapshot);

    // Save the expense to the storage.
    const expenseObj = await this.transformDTO.expenseCreateDTO(
      expenseDTO,
      withholdingTaxSnapshot,
    );

    // Writes the expense transaction with associated transactions under
    // unit-of-work envirement.
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Triggers `onExpenseCreating` event.
      await this.eventEmitter.emitAsync(events.expenses.onCreating, {
        trx,
        expenseDTO,
      } as IExpenseCreatingPayload);

      // Creates a new expense transaction graph.
      const expense = await this.expenseModel()
        .query(trx)
        .upsertGraph(expenseObj);
      // Triggers `onExpenseCreated` event.
      await this.eventEmitter.emitAsync(events.expenses.onCreated, {
        expenseId: expense.id,
        expenseDTO,
        expense,
        trx,
      } as IExpenseCreatedPayload);

      return expense;
    }, trx);
  };
}
