import { Injectable } from '@nestjs/common';
import { CreateExpensePaymentService } from './commands/CreateExpensePayment.service';
import { EditExpensePaymentService } from './commands/EditExpensePayment.service';
import { DeleteExpensePaymentService } from './commands/DeleteExpensePayment.service';
import { ExpensePaymentsPages } from './commands/ExpensePaymentsPages.service';
import { GetExpensePaymentsService } from './queries/GetExpensePayments.service';
import {
  CreateExpensePaymentDto,
  EditExpensePaymentDto,
} from './dtos/ExpensePayment.dto';
import { GetExpensePaymentsFilterDto } from './dtos/GetExpensePaymentsFilter.dto';

@Injectable()
export class ExpensePaymentsApplication {
  constructor(
    private readonly createExpensePaymentService: CreateExpensePaymentService,
    private readonly editExpensePaymentService: EditExpensePaymentService,
    private readonly deleteExpensePaymentService: DeleteExpensePaymentService,
    private readonly expensePaymentsPages: ExpensePaymentsPages,
    private readonly getExpensePaymentsService: GetExpensePaymentsService,
  ) {}

  public createExpensePayment(paymentDTO: CreateExpensePaymentDto) {
    return this.createExpensePaymentService.createExpensePayment(paymentDTO);
  }

  public editExpensePayment(
    expensePaymentId: number,
    paymentDTO: EditExpensePaymentDto,
  ) {
    return this.editExpensePaymentService.editExpensePayment(
      expensePaymentId,
      paymentDTO,
    );
  }

  public deleteExpensePayment(expensePaymentId: number) {
    return this.deleteExpensePaymentService.deleteExpensePayment(expensePaymentId);
  }

  public getExpensePaymentEditPage(expensePaymentId: number) {
    return this.expensePaymentsPages.getExpensePaymentEditPage(expensePaymentId);
  }

  public getExpensePaymentNewPageEntries(vendorId: number) {
    return this.expensePaymentsPages.getNewPageEntries(vendorId);
  }

  public getExpensePayments(filterDTO: GetExpensePaymentsFilterDto) {
    return this.getExpensePaymentsService.getExpensePayments(filterDTO);
  }
}
