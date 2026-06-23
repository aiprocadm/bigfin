/**
 * Канонические провайдер-агностичные сущности CRM (§4.11 роадмапа).
 * Любой коннектор (Битрикс24/amoCRM/собственная CRM) маппит свой формат В эти типы,
 * а движок синхронизации работает только с ними — не зная о провайдере.
 */

/** Контрагент из CRM (маппится в Bigfin `Customer`). */
export interface CrmContact {
  /** Идентификатор записи в исходной CRM (ключ дедупликации). */
  externalId: string;
  displayName: string;
  inn: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
}

/** Сделка из CRM (маппится в Bigfin `Deal`). */
export interface CrmDeal {
  externalId: string;
  name: string;
  /** Сумма сделки → `Deal.costEstimate`. */
  amount: number | null;
  /** Внешний id контрагента этой сделки (связь с `CrmContact.externalId`). */
  contactExternalId: string | null;
  /** Дата закрытия (ISO) → `Deal.deadline`, если есть. */
  closedAt: string | null;
}

/**
 * Интерфейс коннектора CRM (§4.11). Реализации: Битрикс24 (⑯a), amoCRM (⑯b),
 * собственная CRM (⑯c). Синхронизация односторонняя: CRM → Bigfin.
 */
export interface CrmConnector {
  /** Ключ коннектора: 'bitrix24' | 'amocrm' | 'bigfin_crm'. */
  readonly key: string;
  /** Настроены ли учётные данные для текущей организации. */
  isConfigured(): Promise<boolean>;
  /** Тянет контрагентов из CRM в каноническом виде. */
  fetchContacts(): Promise<CrmContact[]>;
  /** Тянет сделки из CRM в каноническом виде. */
  fetchDeals(): Promise<CrmDeal[]>;
}

/** Результат прогона синхронизации (для UI/отчёта). */
export interface CrmSyncResult {
  contactsImported: number;
  contactsSkipped: number;
  dealsImported: number;
  dealsSkipped: number;
}

/** Тип связанной сущности в таблице `crm_sync_links`. */
export type CrmLinkEntityType = 'contact' | 'deal';
