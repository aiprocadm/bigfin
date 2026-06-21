// © 2026 Bigfin
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { MarketingChannel } from '../models/MarketingChannel.model';
import { MarketingMonthly } from '../models/MarketingMonthly.model';
import {
  CreateMarketingChannelDto,
  UpdateMarketingChannelDto,
  UpsertMarketingMonthlyDto,
} from '../dtos/FinancialModel.dto';

export const FINANCIAL_MODEL_SETTINGS_GROUP = 'financial_model';
export const CUSTOMER_LIFETIME_KEY = 'customer_lifetime_months';

/**
 * Ручной ввод маркетинга: справочник каналов привлечения, помесячные
 * расход/новые клиенты и настройка среднего срока жизни клиента (для LTV).
 * Срок жизни хранится в общем механизме Settings (группа financial_model),
 * как ставки налогов в ФОТ.
 */
@Injectable()
export class MarketingDataService {
  constructor(
    @Inject(MarketingChannel.name)
    private readonly channelModel: TenantModelProxy<typeof MarketingChannel>,

    @Inject(MarketingMonthly.name)
    private readonly monthlyModel: TenantModelProxy<typeof MarketingMonthly>,

    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => Promise<SettingsStore>,
  ) {}

  // ── Каналы ──────────────────────────────────────────────

  listChannels() {
    return this.channelModel().query().orderBy('name');
  }

  createChannel(dto: CreateMarketingChannelDto) {
    return this.channelModel().query().insertAndFetch({
      name: dto.name,
      active: true,
    } as any);
  }

  async updateChannel(id: number, dto: UpdateMarketingChannelDto) {
    const patch: Record<string, any> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.active !== undefined) patch.active = dto.active;
    const updated = await this.channelModel()
      .query()
      .patchAndFetchById(id, patch);
    if (!updated) throw new NotFoundException('Канал не найден');
    return updated;
  }

  async deleteChannel(id: number): Promise<void> {
    const deleted = await this.channelModel().query().deleteById(id);
    if (!deleted) throw new NotFoundException('Канал не найден');
  }

  // ── Помесячные цифры ───────────────────────────────────

  /** Upsert по паре (channelId, month): обновляет существующую строку или создаёт новую. */
  async upsertMonthly(dto: UpsertMarketingMonthlyDto) {
    const channel = await this.channelModel().query().findById(dto.channelId);
    if (!channel) throw new NotFoundException('Канал не найден');

    const existing = await this.monthlyModel()
      .query()
      .where('channelId', dto.channelId)
      .where('month', dto.month)
      .first();

    if (existing) {
      return this.monthlyModel().query().patchAndFetchById((existing as any).id, {
        spend: dto.spend,
        newCustomers: dto.newCustomers,
      } as any);
    }
    return this.monthlyModel().query().insertAndFetch({
      channelId: dto.channelId,
      month: dto.month,
      spend: dto.spend,
      newCustomers: dto.newCustomers,
    } as any);
  }

  // ── Настройка срока жизни клиента ──────────────────────

  async setCustomerLifetime(months: number): Promise<{ months: number }> {
    const store = await this.settingsStore();
    store.set({
      group: FINANCIAL_MODEL_SETTINGS_GROUP,
      key: CUSTOMER_LIFETIME_KEY,
      value: months,
    });
    await store.save();
    return { months };
  }
}
