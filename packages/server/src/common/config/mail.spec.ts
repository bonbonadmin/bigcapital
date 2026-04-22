import mailConfig, { getMailFromAddress, getMailFromConfig } from './mail';

const mailEnvKeys = [
  'SMTP2GO_API_KEY',
  'SMTP2GO_API_BASE_URL',
  'SMTP2GO_HOST',
  'SMTP2GO_USERNAME',
  'SMTP2GO_PASSWORD',
  'SMTP2GO_PORT',
  'SMTP2GO_SECURE',
  'SMTP2GO_FROM_NAME',
  'SMTP2GO_FROM_ADDRESS',
  'MAIL_HOST',
  'MAIL_USERNAME',
  'MAIL_PASSWORD',
  'MAIL_PORT',
  'MAIL_SECURE',
  'MAIL_FROM_NAME',
  'MAIL_FROM_ADDRESS',
] as const;

type MailEnvSnapshot = Record<(typeof mailEnvKeys)[number], string | undefined>;

describe('mail config', () => {
  let originalEnv: MailEnvSnapshot;

  beforeEach(() => {
    originalEnv = mailEnvKeys.reduce((acc, key) => {
      acc[key] = process.env[key];
      delete process.env[key];
      return acc;
    }, {} as MailEnvSnapshot);
  });

  afterEach(() => {
    mailEnvKeys.forEach((key) => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });
  });

  it('prefers SMTP2GO settings when both providers are configured', () => {
    process.env.SMTP2GO_API_KEY = 'api-123';
    process.env.SMTP2GO_API_BASE_URL = 'https://api.smtp2go.com/v3';
    process.env.SMTP2GO_HOST = 'mail.smtp2go.com';
    process.env.SMTP2GO_PORT = '2525';
    process.env.SMTP2GO_SECURE = 'false';
    process.env.SMTP2GO_USERNAME = 'smtp2go-user';
    process.env.SMTP2GO_PASSWORD = 'smtp2go-pass';
    process.env.SMTP2GO_FROM_NAME = 'Bigcapital Billing';
    process.env.SMTP2GO_FROM_ADDRESS = 'billing@example.com';

    process.env.MAIL_HOST = 'smtp.example.com';
    process.env.MAIL_PORT = '587';
    process.env.MAIL_SECURE = 'true';
    process.env.MAIL_USERNAME = 'fallback-user';
    process.env.MAIL_PASSWORD = 'fallback-pass';
    process.env.MAIL_FROM_NAME = 'Fallback Sender';
    process.env.MAIL_FROM_ADDRESS = 'fallback@example.com';

    const config = mailConfig();

    expect(config.apiKey).toBe('api-123');
    expect(config.apiBaseUrl).toBe('https://api.smtp2go.com/v3');
    expect(config.host).toBe('mail.smtp2go.com');
    expect(config.port).toBe(2525);
    expect(config.secure).toBe(false);
    expect(config.username).toBe('smtp2go-user');
    expect(config.password).toBe('smtp2go-pass');
    expect(config.from).toEqual({
      name: 'Bigcapital Billing',
      address: 'billing@example.com',
    });
    expect(config.fromAddress).toBe('Bigcapital Billing <billing@example.com>');
  });

  it('uses SMTP2GO defaults when explicit mail settings are missing', () => {
    process.env.SMTP2GO_USERNAME = 'smtp2go-user';
    process.env.SMTP2GO_PASSWORD = 'smtp2go-pass';
    process.env.SMTP2GO_FROM_ADDRESS = 'billing@example.com';

    const config = mailConfig();

    expect(config.apiBaseUrl).toBe('https://api.smtp2go.com/v3');
    expect(config.host).toBe('mail.smtp2go.com');
    expect(config.port).toBe(2525);
    expect(config.secure).toBe(false);
    expect(config.fromAddress).toBe('billing@example.com');
  });

  it('supports API-key transport without SMTP credentials', () => {
    process.env.SMTP2GO_API_KEY = 'api-transport-key';

    const config = mailConfig();

    expect(config.apiKey).toBe('api-transport-key');
    expect(config.host).toBe('mail.smtp2go.com');
    expect(config.port).toBe(2525);
  });

  it('uses the secure SMTP default port when secure transport is enabled', () => {
    process.env.SMTP2GO_SECURE = 'true';

    const config = mailConfig();

    expect(config.secure).toBe(true);
    expect(config.port).toBe(465);
  });

  it('formats the sender header gracefully with partial sender data', () => {
    expect(
      getMailFromAddress({
        name: 'Bigcapital Billing',
        address: 'billing@example.com',
      }),
    ).toBe('Bigcapital Billing <billing@example.com>');
    expect(getMailFromAddress({ address: 'billing@example.com' })).toBe(
      'billing@example.com',
    );
    expect(getMailFromAddress({ name: 'Bigcapital Billing' })).toBe(
      'Bigcapital Billing',
    );
    expect(getMailFromAddress({})).toBe('');
  });

  it('builds sender config from the first available provider values', () => {
    process.env.MAIL_FROM_NAME = 'Fallback Sender';
    process.env.MAIL_FROM_ADDRESS = 'fallback@example.com';

    expect(getMailFromConfig()).toEqual({
      name: 'Fallback Sender',
      address: 'fallback@example.com',
    });
  });
});
