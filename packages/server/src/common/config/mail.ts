import { registerAs } from '@nestjs/config';
import { parseBoolean } from '@/utils/parse-boolean';

export interface MailFromConfig {
  name?: string;
  address?: string;
}

type MailEnvKey =
  | 'SMTP2GO_API_KEY'
  | 'SMTP2GO_API_BASE_URL'
  | 'SMTP2GO_HOST'
  | 'SMTP2GO_USERNAME'
  | 'SMTP2GO_PASSWORD'
  | 'SMTP2GO_PORT'
  | 'SMTP2GO_SECURE'
  | 'SMTP2GO_FROM_NAME'
  | 'SMTP2GO_FROM_ADDRESS'
  | 'MAIL_HOST'
  | 'MAIL_USERNAME'
  | 'MAIL_PASSWORD'
  | 'MAIL_PORT'
  | 'MAIL_SECURE'
  | 'MAIL_FROM_NAME'
  | 'MAIL_FROM_ADDRESS';

export const getFirstMailEnv = (...keys: MailEnvKey[]) => {
  const resolvedKey = keys.find((key) => process.env[key]?.trim());

  return resolvedKey ? process.env[resolvedKey] : undefined;
};

export const getMailFromConfig = (): MailFromConfig => ({
  name: getFirstMailEnv('SMTP2GO_FROM_NAME', 'MAIL_FROM_NAME'),
  address: getFirstMailEnv('SMTP2GO_FROM_ADDRESS', 'MAIL_FROM_ADDRESS'),
});

export const getMailFromAddress = ({
  name,
  address,
}: MailFromConfig): string => {
  if (name && address) {
    return `${name} <${address}>`;
  }
  return address || name || '';
};

const getMailPort = (secure: boolean): number => {
  const fallbackPort = secure ? 465 : 2525;
  const configuredPort = getFirstMailEnv('SMTP2GO_PORT', 'MAIL_PORT');
  const port = Number.parseInt(configuredPort ?? '', 10);

  return Number.isFinite(port) ? port : fallbackPort;
};

export default registerAs('mail', () => {
  const secure = parseBoolean<boolean>(
    getFirstMailEnv('SMTP2GO_SECURE', 'MAIL_SECURE'),
    false,
  ) as boolean;
  const from = getMailFromConfig();

  return {
    apiKey: getFirstMailEnv('SMTP2GO_API_KEY'),
    apiBaseUrl:
      getFirstMailEnv('SMTP2GO_API_BASE_URL') || 'https://api.smtp2go.com/v3',
    host: getFirstMailEnv('SMTP2GO_HOST', 'MAIL_HOST') || 'mail.smtp2go.com',
    username: getFirstMailEnv('SMTP2GO_USERNAME', 'MAIL_USERNAME'),
    password: getFirstMailEnv('SMTP2GO_PASSWORD', 'MAIL_PASSWORD'),
    port: getMailPort(secure),
    secure,
    from,
    fromAddress: getMailFromAddress(from),
  };
});
