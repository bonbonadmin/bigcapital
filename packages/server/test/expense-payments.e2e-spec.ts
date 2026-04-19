import * as request from 'supertest';
import { faker } from '@faker-js/faker';
import { app, AuthorizationHeader, orgainzationId } from './init-app-test';

let vendorId;
let expenseId;
let payableAccountId;

const createExpensePaymentRequest = () => ({
  vendorId,
  paymentAccountId: 1000,
  paymentDate: '2026-04-19',
  paymentNumber: faker.string.alphanumeric(10),
  entries: [
    {
      expenseId,
      paymentAmount: 100,
    },
  ],
});

describe('Expense Payments (e2e)', () => {
  beforeAll(async () => {
    const vendor = await request(app.getHttpServer())
      .post('/vendors')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send({ displayName: 'Test Expense Payment Vendor' });

    vendorId = vendor.body.id;

    const accountsResponse = await request(app.getHttpServer())
      .get('/accounts')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader);

    payableAccountId = accountsResponse.body.accounts.find(
      (account) => account.account_type === 'accounts-payable',
    )?.id;

    const expense = await request(app.getHttpServer())
      .post('/expenses')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send({
        exchangeRate: 1,
        description: faker.lorem.sentence(),
        paymentAccountId: null,
        payableAccountId,
        payeeId: vendorId,
        referenceNo: faker.string.alphanumeric(10),
        publish: true,
        paymentDate: faker.date.recent(),
        categories: [
          {
            expenseAccountId: 1021,
            amount: 100,
            description: faker.lorem.sentence(),
          },
        ],
        branchId: 1,
      });

    expenseId = expense.body.id;
  });

  it('/expense-payments (POST)', () => {
    return request(app.getHttpServer())
      .post('/expense-payments')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(createExpensePaymentRequest())
      .expect(201);
  });

  it('/expense-payments (GET)', () => {
    return request(app.getHttpServer())
      .get('/expense-payments')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .expect(200);
  });

  it('/expense-payments/:id (PUT)', async () => {
    const response = await request(app.getHttpServer())
      .post('/expense-payments')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(createExpensePaymentRequest());
    const expensePaymentId = response.body.id;

    return request(app.getHttpServer())
      .put(`/expense-payments/${expensePaymentId}`)
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(createExpensePaymentRequest())
      .expect(200);
  });

  it('/expense-payments/:id (DELETE)', async () => {
    const response = await request(app.getHttpServer())
      .post('/expense-payments')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(createExpensePaymentRequest());
    const expensePaymentId = response.body.id;

    return request(app.getHttpServer())
      .delete(`/expense-payments/${expensePaymentId}`)
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .expect(200);
  });

  it('/expense-payments/new-page/entries (GET)', () => {
    return request(app.getHttpServer())
      .get('/expense-payments/new-page/entries')
      .query({ vendorId })
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .expect(200);
  });

  it('/expense-payments/:id/edit-page (GET)', async () => {
    const response = await request(app.getHttpServer())
      .post('/expense-payments')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(createExpensePaymentRequest());
    const expensePaymentId = response.body.id;

    return request(app.getHttpServer())
      .get(`/expense-payments/${expensePaymentId}/edit-page`)
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .expect(200);
  });
});
