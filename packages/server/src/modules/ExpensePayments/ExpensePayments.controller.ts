import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { IPaymentMadeAction } from '@/modules/BillPayments/types/BillPayments.types';
import { ExpensePaymentsApplication } from './ExpensePaymentsApplication.service';
import {
  CreateExpensePaymentDto,
  EditExpensePaymentDto,
} from './dtos/ExpensePayment.dto';
import { GetExpensePaymentsFilterDto } from './dtos/GetExpensePaymentsFilter.dto';

@Controller('expense-payments')
@ApiTags('Expense Payments')
@UseGuards(AuthorizationGuard, PermissionGuard)
export class ExpensePaymentsController {
  constructor(
    private readonly expensePaymentsApplication: ExpensePaymentsApplication,
  ) {}

  @Post()
  @RequirePermission(IPaymentMadeAction.Create, AbilitySubject.PaymentMade)
  @ApiOperation({ summary: 'Create a new expense payment.' })
  public createExpensePayment(@Body() paymentDTO: CreateExpensePaymentDto) {
    return this.expensePaymentsApplication.createExpensePayment(paymentDTO);
  }

  @Delete(':expensePaymentId')
  @RequirePermission(IPaymentMadeAction.Delete, AbilitySubject.PaymentMade)
  @ApiOperation({ summary: 'Delete the given expense payment.' })
  @ApiParam({
    name: 'expensePaymentId',
    required: true,
    type: Number,
    description: 'The expense payment id',
  })
  public deleteExpensePayment(@Param('expensePaymentId') expensePaymentId: string) {
    return this.expensePaymentsApplication.deleteExpensePayment(
      Number(expensePaymentId),
    );
  }

  @Put(':expensePaymentId')
  @RequirePermission(IPaymentMadeAction.Edit, AbilitySubject.PaymentMade)
  @ApiOperation({ summary: 'Edit the given expense payment.' })
  public editExpensePayment(
    @Param('expensePaymentId') expensePaymentId: string,
    @Body() paymentDTO: EditExpensePaymentDto,
  ) {
    return this.expensePaymentsApplication.editExpensePayment(
      Number(expensePaymentId),
      paymentDTO,
    );
  }

  @Get('/new-page/entries')
  @RequirePermission(IPaymentMadeAction.View, AbilitySubject.PaymentMade)
  @ApiOperation({
    summary:
      'Retrieves the payable expense entries of the new page once vendor be selected.',
  })
  @ApiQuery({
    name: 'vendorId',
    required: true,
    type: Number,
    description: 'The vendor id',
  })
  public getExpensePaymentNewPageEntries(@Query('vendorId') vendorId: number) {
    return this.expensePaymentsApplication.getExpensePaymentNewPageEntries(
      vendorId,
    );
  }

  @Get('/:expensePaymentId/edit-page')
  @RequirePermission(IPaymentMadeAction.View, AbilitySubject.PaymentMade)
  @ApiOperation({
    summary: 'Retrieves the edit page of the given expense payment.',
  })
  public getExpensePaymentEditPage(
    @Param('expensePaymentId') expensePaymentId: number,
  ) {
    return this.expensePaymentsApplication.getExpensePaymentEditPage(
      expensePaymentId,
    );
  }

  @Get()
  @RequirePermission(IPaymentMadeAction.View, AbilitySubject.PaymentMade)
  @ApiOperation({ summary: 'Retrieves the expense payments list.' })
  public getExpensePayments(@Query() filterDTO: GetExpensePaymentsFilterDto) {
    return this.expensePaymentsApplication.getExpensePayments(filterDTO);
  }
}
