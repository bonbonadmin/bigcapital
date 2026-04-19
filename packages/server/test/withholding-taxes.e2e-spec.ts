import * as request from 'supertest';
import { faker } from '@faker-js/faker';
import { app, AuthorizationHeader, orgainzationId } from './init-app-test';

let accountId;

const makeWithholdingTaxRequest = (overrides = {}) => ({
  name: `PPh ${faker.number.int({ min: 1, max: 30 })}`,
  rate: faker.number.float({ min: 0.1, max: 15, precision: 0.01 }),
  description: faker.lorem.sentence(),
  accountId,
  ...overrides,
});

describe('Withholding Taxes (e2e)', () => {
  beforeAll(async () => {
    const accountsResponse = await request(app.getHttpServer())
      .get('/accounts')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader);

    accountId = accountsResponse.body.accounts.find(
      (account) =>
        account.account_type === 'tax-payable' ||
        account.account_type === 'other-current-liability',
    )?.id;
  });

  it('/withholding-taxes (POST)', () => {
    return request(app.getHttpServer())
      .post('/withholding-taxes')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(makeWithholdingTaxRequest())
      .expect(201);
  });

  it('/withholding-taxes (GET)', () => {
    return request(app.getHttpServer())
      .get('/withholding-taxes')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .expect(200);
  });

  it('/withholding-taxes/:id (GET)', async () => {
    const response = await request(app.getHttpServer())
      .post('/withholding-taxes')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(makeWithholdingTaxRequest());

    return request(app.getHttpServer())
      .get(`/withholding-taxes/${response.body.id}`)
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .expect(200);
  });

  it('/withholding-taxes/:id (PUT)', async () => {
    const response = await request(app.getHttpServer())
      .post('/withholding-taxes')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(makeWithholdingTaxRequest());

    return request(app.getHttpServer())
      .put(`/withholding-taxes/${response.body.id}`)
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(makeWithholdingTaxRequest({ name: 'PPh 23 Updated' }))
      .expect(200);
  });

  it('/withholding-taxes/:id (DELETE)', async () => {
    const response = await request(app.getHttpServer())
      .post('/withholding-taxes')
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .send(makeWithholdingTaxRequest());

    return request(app.getHttpServer())
      .delete(`/withholding-taxes/${response.body.id}`)
      .set('organization-id', orgainzationId)
      .set('Authorization', AuthorizationHeader)
      .expect(200);
  });
});
