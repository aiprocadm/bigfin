// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { MailTransporter } from '@/modules/Mail/MailTransporter.service';
import { Mail } from '@/modules/Mail/Mail';
import { DeliveryChannel } from './DeliveryChannel';
import { Candidate } from '../utils/selectToFire';
import { NotificationsSettingsService } from '../NotificationsSettings.service';
import { NotificationTextsService } from '../NotificationTexts.service';
import { resolveRecipient } from '../utils/resolveRecipient';

@Injectable()
export class EmailChannelService implements DeliveryChannel {
  readonly key = 'email';

  constructor(
    private readonly texts: NotificationTextsService,
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

    const rendered = await this.texts.render(
      candidate.eventType,
      candidate.payload,
    );
    if (!rendered) return;

    const mail = new Mail()
      .setSubject(rendered.title)
      .setTo(recipient)
      .setView('mail/Notification.html')
      .setData({
        title: rendered.title,
        body: rendered.body,
        footer: rendered.footer,
      } as any);

    await this.mailTransporter.send(mail);
  }
}
