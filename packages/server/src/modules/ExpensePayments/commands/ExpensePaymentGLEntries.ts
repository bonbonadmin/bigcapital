import { Knex } from 'knex';
import { Inject, Injectable } from '@nestjs/common';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountRepository } from '@/modules/Accounts/repositories/Account.repository';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ExpensePayment } from '../models/ExpensePayment';
import { ExpensePaymentGL } from './ExpensePaymentGL';

@Injectable()
export class ExpensePaymentGLEntries {
  constructor(
    private readonly ledgerStorage: LedgerStorageService,
    private readonly accountRepository: AccountRepository,
    private readonly tenancyContext: TenancyContext,

    @Inject(ExpensePayment.name)
    private readonly expensePaymentModel: TenantModelProxy<typeof ExpensePayment>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public writePaymentGLEntries = async (
    expensePaymentId: number,
    trx?: Knex.Transaction,
  ): Promise<void> => {
    const payment = await this.expensePaymentModel()
      .query(trx)
      .findById(expensePaymentId)
      .withGraphFetched('entries.expense');

    const tenantMeta = await this.tenancyContext.getTenantMetadata();

    const payableAccountId =
      payment.payableAccountId ||
      (
        await this.accountRepository.findOrCreateAccountsPayable(
          payment.currencyCode,
          {},
          trx,
        )
      ).id;
    const EXGainLossAccount = await this.accountModel()
      .query(trx)
      .modify('findBySlug', 'exchange-grain-loss')
      .first();

    const ledger = new ExpensePaymentGL(payment)
      .setAPAccountId(payableAccountId)
      .setGainLossAccountId(EXGainLossAccount.id)
      .setBaseCurrency(tenantMeta.baseCurrency)
      .getExpensePaymentLedger();

    await this.ledgerStorage.commit(ledger, trx);
  };

  public rewritePaymentGLEntries = async (
    expensePaymentId: number,
    trx?: Knex.Transaction,
  ): Promise<void> => {
    await this.revertPaymentGLEntries(expensePaymentId, trx);
    await this.writePaymentGLEntries(expensePaymentId, trx);
  };

  public revertPaymentGLEntries = async (
    expensePaymentId: number,
    trx?: Knex.Transaction,
  ): Promise<void> => {
    await this.ledgerStorage.deleteByReference(
      expensePaymentId,
      'ExpensePayment',
      trx,
    );
  };
}
