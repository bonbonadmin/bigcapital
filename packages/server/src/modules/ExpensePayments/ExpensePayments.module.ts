import { Module } from '@nestjs/common';
import { AccountsModule } from '@/modules/Accounts/Accounts.module';
import { LedgerModule } from '@/modules/Ledger/Ledger.module';
import { BranchTransactionDTOTransformer } from '@/modules/Branches/integrations/BranchTransactionDTOTransform';
import { BranchesSettingsService } from '@/modules/Branches/BranchesSettings';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { ExpensePaymentsApplication } from './ExpensePaymentsApplication.service';
import { ExpensePaymentsController } from './ExpensePayments.controller';
import { ExpensePaymentValidators } from './commands/ExpensePaymentValidators.service';
import { CommandExpensePaymentDTOTransformer } from './commands/CommandExpensePaymentDTOTransformer.service';
import { ExpensePaymentExpenseSync } from './commands/ExpensePaymentExpenseSync.service';
import { ExpensePaymentGLEntries } from './commands/ExpensePaymentGLEntries';
import { ExpensePaymentsPages } from './commands/ExpensePaymentsPages.service';
import { CreateExpensePaymentService } from './commands/CreateExpensePayment.service';
import { EditExpensePaymentService } from './commands/EditExpensePayment.service';
import { DeleteExpensePaymentService } from './commands/DeleteExpensePayment.service';
import { GetExpensePaymentsService } from './queries/GetExpensePayments.service';
import { GetExpensePaymentService } from './queries/GetExpensePayment.service';

@Module({
  imports: [LedgerModule, AccountsModule],
  providers: [
    ExpensePaymentsApplication,
    ExpensePaymentValidators,
    CommandExpensePaymentDTOTransformer,
    ExpensePaymentExpenseSync,
    ExpensePaymentGLEntries,
    ExpensePaymentsPages,
    CreateExpensePaymentService,
    EditExpensePaymentService,
    DeleteExpensePaymentService,
    GetExpensePaymentsService,
    GetExpensePaymentService,
    BranchTransactionDTOTransformer,
    BranchesSettingsService,
    TenancyContext,
  ],
  controllers: [ExpensePaymentsController],
})
export class ExpensePaymentsModule {}
