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
import { TelegramChannelService } from '../delivery/TelegramChannel.service';
import { DeliveryChannel } from '../delivery/DeliveryChannel';
import { selectToFire, Candidate, RecentFire } from '../utils/selectToFire';

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
    private readonly telegram: TelegramChannelService,
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

    // Get per-tenant settings: cooldown window.
    const { cooldownHours } = await this.settings.get();

    // Run each enabled evaluator to collect firing candidates.
    const candidates: Candidate[] = [];
    for (const pref of prefs) {
      const threshold = pref.threshold ? JSON.parse(pref.threshold) : {};
      let prefChannels: string[] = ['email'];
      try {
        prefChannels = pref.channels ? JSON.parse(pref.channels) : ['email'];
      } catch {
        prefChannels = ['email'];
      }

      let produced: Candidate[] = [];
      if (pref.eventType === 'cash_gap') {
        produced = await this.cashGap.evaluate(threshold);
      } else if (pref.eventType === 'low_balance') {
        produced = await this.lowBalance.evaluate(threshold);
      } else if (pref.eventType === 'overdue') {
        produced = await this.overdue.evaluate(threshold);
      }
      produced.forEach((c) => {
        c.channels = prefChannels;
      });
      candidates.push(...produced);
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

    const registry: Record<string, DeliveryChannel> = {
      [this.email.key]: this.email,
      [this.telegram.key]: this.telegram,
    };

    let posted = 0;
    for (const candidate of toFire) {
      const firedAt = moment().toMySqlDateTime();

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
      const wanted = candidate.channels?.length ? candidate.channels : ['email'];
      for (const key of wanted) {
        const channel = registry[key];
        if (!channel) continue;
        if (!(await channel.isConfigured())) continue;
        try {
          await channel.deliver(candidate);
          channelsSent.push(key);
        } catch (err) {
          console.error(
            `[notifications] ${key} delivery failed for ${candidate.eventType}:`,
            err,
          );
        }
      }

      await this.notifModel()
        .query()
        .findById(inserted.id)
        .patch({ channelsSent: JSON.stringify(channelsSent) } as any);

      posted++;
    }

    return { posted };
  }
}
