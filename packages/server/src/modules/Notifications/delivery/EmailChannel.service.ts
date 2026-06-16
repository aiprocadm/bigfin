// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';
import { MailTransporter } from '@/modules/Mail/MailTransporter.service';
import { Mail } from '@/modules/Mail/Mail';
import { DeliveryChannel } from './DeliveryChannel';
import { Candidate } from '../utils/selectToFire';
import { NotificationsSettingsService } from '../NotificationsSettings.service';
import { resolveRecipient } from '../utils/resolveRecipient';

@Injectable()
export class EmailChannelService implements DeliveryChannel {
  readonly key = 'email';

  constructor(
    private readonly orgI18n: OrganizationI18nService,
    private readonly mailTransporter: MailTransporter,
    private readonly settings: NotificationsSettingsService,
  ) {}

  public async isConfigured(): Promise<boolean> {
    const { recipientEmail } = await this.settings.get();
    return resolveRecipient(recipientEmail) !== null;
  }

  public async deliver(candidate: Candidate): Promise<void> {
    const { recipientEmail } = await this.settings.get();
    const recipient = resolveRecipient(recipientEmail);
    if (!recipient) return;

    const args = candidate.payload ?? {};
    const subject = await this.orgI18n.translate(
      `notifications.${candidate.eventType}.title`,
    );
    const body = await this.orgI18n.translate(
      `notifications.${candidate.eventType}.body`,
      { args },
    );
    const footer = await this.orgI18n.translate('notifications.email_footer');

    const mail = new Mail()
      .setSubject(subject)
      .setTo(recipient)
      .setView('mail/Notification.html')
      .setData({ title: subject, body, footer } as any);

    await this.mailTransporter.send(mail);
  }
}
