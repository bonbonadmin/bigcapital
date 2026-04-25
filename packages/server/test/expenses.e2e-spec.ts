import * as request from 'supertest';
import { faker } from '@faker-js/faker';
import { app, AuthorizationHeader, orgainzationId } from './init-app-test';

let vendorId;
let payableAccountId;

const makeExpenseRequest = (overrides = {}) => ({
  exchangeRate: 1,
  description: faker.lorem.sentence(),
  paymentAccountId: 1000,
  referenceNo: faker.string.alphanumeric(10),
  publish: true,
  paymentDate: faker.date.recent(),
  categories: [
    {
      expenseAccountId: 1021,
      amount: faker.number.float({ min: 10, max: 1000, precision: 0.01 }),
      description: faker.lorem.sentence(),
    },
  ],
  branchId: 1,
  ...overrides,
});

describe('Expenses (e2e)', () => {
  beforeAll(async () => {
    const vendor = await request(app.getHttpServer())
      .post('/vendors')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send({ displayName: 'Test Expense Vendor' });

    vendorId = vendor.body.id;

    const accountsResponse = await request(app.getHttpServer())
      .get('/accounts')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader);

    payableAccountId = accountsResponse.body.accounts.find(
      (account) => account.account_type === 'accounts-payable',
    )?.id;
  });

  it('/expenses (POST)', () => {
    return request(app.getHttpServer())
      .post('/expenses')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(makeExpenseRequest({ payeeId: vendorId }))
      .expect(201);
  });

  it('/expenses (POST) allows payable account with vendor', () => {
    return request(app.getHttpServer())
      .post('/expenses')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(
        makeExpenseRequest({
          paymentAccountId: null,
          payableAccountId,
          payeeId: vendorId,
        }),
      )
      .expect(201);
  });

  it('/expenses (POST) rejects publishing without vendor', () => {
    return request(app.getHttpServer())
      .post('/expenses')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(makeExpenseRequest({ payeeId: null }))
      .expect(400);
  });

  it('/expenses (POST) allows paid drafts without vendor', () => {
    return request(app.getHttpServer())
      .post('/expenses')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(makeExpenseRequest({ publish: false, payeeId: null }))
      .expect(201);
  });

  it('/expenses (POST) allows payable drafts without vendor', () => {
    return request(app.getHttpServer())
      .post('/expenses')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(
        makeExpenseRequest({
          publish: false,
          paymentAccountId: null,
          payableAccountId,
          payeeId: null,
        }),
      )
      .expect(201);
  });

  it('/expenses/:id/publish (POST) rejects drafts without vendor', async () => {
    const response = await request(app.getHttpServer())
      .post('/expenses')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(makeExpenseRequest({ publish: false, payeeId: null }));

    const expenseId = response.body.id;

    return request(app.getHttpServer())
      .post(`/expenses/${expenseId}/publish`)
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .expect(400);
  });

  it('/expenses/:id (PUT)', async () => {
    const response = await request(app.getHttpServer())
      .post('/expenses')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(makeExpenseRequest({ payeeId: vendorId }));

    const expenseId = response.body.id;

    return request(app.getHttpServer())
      .put(`/expenses/${expenseId}`)
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(makeExpenseRequest({ payeeId: vendorId }))
      .expect(200);
  });

  it('/expenses/:id (GET)', async () => {
    const response = await request(app.getHttpServer())
      .post('/expenses')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(makeExpenseRequest({ payeeId: vendorId }));

    const expenseId = response.body.id;

    return request(app.getHttpServer())
      .get(`/expenses/${expenseId}`)
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .expect(200);
  });

  it('/expenses/:id (DELETE)', async () => {
    const response = await request(app.getHttpServer())
      .post('/expenses')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(makeExpenseRequest({ payeeId: vendorId }));

    const expenseId = response.body.id;

    return request(app.getHttpServer())
      .delete(`/expenses/${expenseId}`)
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .expect(200);
  });
});
