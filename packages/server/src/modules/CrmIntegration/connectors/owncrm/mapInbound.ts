import { CrmContact, CrmDeal } from '../../types';

/** Результат разбора входящего payload собственной CRM (⑯c). */
export interface InboundCrmEntities {
  contact?: CrmContact;
  deal?: CrmDeal;
}

/**
 * Чистый разбор входящего webhook-payload собственной CRM Bigfin (⑯c).
 * Контракт задаёт сам Bigfin: `{ type: 'contact' | 'deal', ...поля }`.
 * Нормализует в канонические `CrmContact`/`CrmDeal`. Неизвестный тип → ошибка.
 */
export const mapInboundCrmPayload = (body: any): InboundCrmEntities => {
  const type = body?.type;

  if (type === 'contact') {
    return { contact: toContact(body) };
  }
  if (type === 'deal') {
    return { deal: toDeal(body) };
  }
  throw new Error('CRM_WEBHOOK_UNKNOWN_TYPE');
};

const toContact = (b: any): CrmContact => ({
  externalId: String(b.externalId),
  displayName: b.displayName || `Контакт ${String(b.externalId)}`,
  inn: b.inn || null,
  email: b.email || null,
  phone: b.phone || null,
  companyName: b.companyName || null,
});

const toDeal = (b: any): CrmDeal => ({
  externalId: String(b.externalId),
  name: b.name || `Сделка ${String(b.externalId)}`,
  amount: typeof b.amount === 'number' ? b.amount : null,
  contactExternalId:
    b.contactExternalId != null ? String(b.contactExternalId) : null,
  closedAt: b.closedAt || null,
});
