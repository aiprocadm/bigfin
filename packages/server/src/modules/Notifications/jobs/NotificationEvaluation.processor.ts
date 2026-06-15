// © 2026 Bigfin
import { Inject, Scope } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ClsService, UseCls } from 'nestjs-cls';
import * as moment from 'moment';
import '@/utils/moment-mysql';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';
import { NOTIFICATIONS_QUEUE } from '../constants';
import { Notification } from '../models/Notification.model';
import { NotificationPreference } from '../models/NotificationPreference.model';
import { NotificationsSettingsService } from '../NotificationsSettings.service';
import { CashGapEvaluatorService } from '../evaluators/CashGapEvaluator.service';
import { LowBalanceEvaluatorService } from '../evaluators/LowBalanceEvaluator.service';
import { OverdueEvaluatorService } from '../evaluators/OverdueEvaluator.service';
import { EmailChannelService } from '../delivery/EmailChannel.service';
import { selectToFire, Candidate, RecentFire } from '../utils/selectToFire';
import { resolveRecipient } from '../utils/resolveRecipient';

@Processor({ name: NOTIFICATIONS_QUEUE, scope: Scope.REQUEST })
export class NotificationEvaluationProcessor extends WorkerHost {
  constructor(
    private readonly cls: ClsService,
    private readonly featuresManager: FeaturesManager,
    private readonly settings: NotificationsSettingsService,
    private readonly cashGap: CashGapEvaluatorService,
    private readonly lowBalance: LowBalanceEvaluatorService,
    private readonly overdue: OverdueEvaluatorService,
    private readonly email: EmailChannelService,
    @Inject(NotificationPreference.name)
    private readonly prefModel: TenantModelProxy<typeof NotificationPreference>,
    @Inject(Notification.name)
    private readonly notifModel: TenantModelProxy<typeof Notification>,
  ) {
    super();
  }

  /**
   * Process a single-tenant notification evaluation job.
   * Sets CLS organizationId so all tenant-scoped DB queries resolve correctly.
   */
  @UseCls()
  async process(job: Job<{ organizationId: string }>): Promise<{ posted: number } | { skipped: string }> {
    this.cls.set('organizationId', job.data.organizationId);

    // Early-exit if the notifications feature is not enabled for this tenant.
    const isEnabled = await this.featuresManager.accessible(Features.NOTIFICATIONS);
    if (!isEnabled) return { skipped: 'feature_off' };

    // Load enabled notification preferences.
    const prefs: NotificationPreference[] = await this.prefModel()
      .query()
      .where('enabled', true);

    if (!prefs.length) return { posted: 0 };

    // Get per-tenant settings: cooldown window and optional explicit recipient.
    const { cooldownHours, recipientEmail } = await this.settings.get();
    const recipient = resolveRecipient(recipientEmail);

    // Run each enabled evaluator to collect firing candidates.
    const candidates: Candidate[] = [];
    for (const pref of prefs) {
      const threshold = pref.threshold ? JSON.parse(pref.threshold) : {};
      if (pref.eventType === 'cash_gap') {
        candidates.push(...await this.cashGap.evaluate(threshold));
      } else if (pref.eventType === 'low_balance') {
        candidates.push(...await this.lowBalance.evaluate(threshold));
      } else if (pref.eventType === 'overdue') {
        candidates.push(...await this.overdue.evaluate(threshold));
      }
    }

    if (!candidates.length) return { posted: 0 };

    // Pull recent fire records for dedup keys to apply cooldown.
    const dedupKeys = candidates.map((c) => c.dedupKey);
    const recent: RecentFire[] = await this.notifModel()
      .query()
      .whereIn('dedupKey', dedupKeys)
      .orderBy('firedAt', 'desc') as unknown as RecentFire[];

    const now = moment().toISOString();
    const toFire = selectToFire(candidates, recent, cooldownHours, now);

    if (!toFire.length) return { posted: 0 };

    let posted = 0;
    for (const candidate of toFire) {
      const firedAt = moment().toMySqlDateTime();

      // Persist the notification row before attempting delivery.
      const inserted: any = await this.notifModel().query().insertAndFetch({
        eventType: candidate.eventType,
        title: candidate.title,
        body: candidate.body,
        dedupKey: candidate.dedupKey,
        payload: JSON.stringify(candidate.payload ?? {}),
        firedAt,
        channelsSent: JSON.stringify([]),
      } as any);

      const channelsSent: string[] = [];

      if (recipient) {
        try {
          await this.email.deliver(candidate, recipient);
          channelsSent.push('email');
        } catch (err) {
          console.error(
            `[notifications] Email delivery failed for ${candidate.eventType}:`,
            err,
          );
        }
      } else {
        console.warn(
          `[notifications] No recipient resolved for ${candidate.eventType} — skipping email delivery. Set recipientEmail in notification settings.`,
        );
      }

      // Patch the notification row with the actual channels that were attempted.
      await this.notifModel()
        .query()
        .findById(inserted.id)
        .patch({ channelsSent: JSON.stringify(channelsSent) } as any);

      posted++;
    }

    return { posted };
  }
}
