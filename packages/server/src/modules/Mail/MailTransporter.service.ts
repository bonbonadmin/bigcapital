import axios from 'axios';
import { Transporter } from 'nodemailer';
import { Mail } from './Mail';
import { Inject, Injectable } from '@nestjs/common';
import { MAIL_TRANSPORTER_PROVIDER } from './Mail.constants';
import { ConfigService } from '@nestjs/config';

const MailComposer = require('nodemailer/lib/mail-composer');

@Injectable()
export class MailTransporter {
  constructor(
    private readonly configService: ConfigService,
    @Inject(MAIL_TRANSPORTER_PROVIDER)
    private readonly transporter: Transporter,
  ) {}

  async send(mail: Mail) {
    const smtp2goApiKey = this.configService.get<string>('mail.apiKey');

    if (smtp2goApiKey) {
      return this.sendWithSmtp2goApi(mail, smtp2goApiKey);
    }
    return this.transporter.sendMail(mail.mailOptions);
  }

  private async sendWithSmtp2goApi(mail: Mail, apiKey: string) {
    const apiBaseUrl = this.configService.get<string>('mail.apiBaseUrl');
    const mimeMessage = await new MailComposer(mail.mailOptions)
      .compile()
      .build();

    return axios.post(
      `${apiBaseUrl}/email/mime`,
      {
        mime_email: mimeMessage.toString('base64'),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Smtp2go-Api-Key': apiKey,
        },
      },
    );
  }
}
