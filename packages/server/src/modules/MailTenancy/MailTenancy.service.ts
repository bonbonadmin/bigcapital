import { Injectable } from '@nestjs/common';
import { TenancyContext } from '../Tenancy/TenancyContext.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailTenancy {
  constructor(
    private readonly tenancyContext: TenancyContext,
    private readonly config: ConfigService,
  ) {}

  /**
   * Retrieves the senders mails of the given tenant.
   */
  public async senders() {
    const tenantMetadata = await this.tenancyContext.getTenantMetadata();
    const fromAddress = this.config.get<string>('mail.from.address');
    const fromName =
      this.config.get<string>('mail.from.name') || tenantMetadata.name;

    return [
      {
        mail: fromAddress,
        label: fromName,
        primary: true,
      },
    ].filter((item) => item.mail);
  }
}
