import { CrmContact, CrmDeal } from '../../types';

/**
 * Чистый маппинг сырого контакта Битрикс24 (`crm.contact.list`) в канонический CrmContact.
 * Формат REST Битрикс24 стабилен: NAME/LAST_NAME/COMPANY_TITLE, EMAIL[]/PHONE[] — массивы
 * объектов с VALUE, ИНН — в пользовательском поле UF_CRM_INN (если настроено на портале).
 */
export const mapBitrixContact = (raw: any): CrmContact => {
  const externalId = String(raw.ID);
  const fullName = [raw.NAME, raw.LAST_NAME].filter(Boolean).join(' ').trim();
  const companyName = raw.COMPANY_TITLE || null;
  const displayName = fullName || companyName || `Контакт ${externalId}`;

  return {
    externalId,
    displayName,
    inn: raw.UF_CRM_INN || null,
    email: firstValue(raw.EMAIL),
    phone: firstValue(raw.PHONE),
    companyName,
  };
};

/**
 * Чистый маппинг сырой сделки Битрикс24 (`crm.deal.list`) в канонический CrmDeal.
 * OPPORTUNITY — сумма строкой; CONTACT_ID — id связанного контакта; CLOSEDATE — дата закрытия.
 */
export const mapBitrixDeal = (raw: any): CrmDeal => {
  const externalId = String(raw.ID);

  return {
    externalId,
    name: raw.TITLE || `Сделка ${externalId}`,
    amount: parseAmount(raw.OPPORTUNITY),
    contactExternalId: raw.CONTACT_ID ? String(raw.CONTACT_ID) : null,
    closedAt: raw.CLOSEDATE || null,
  };
};

/** Первое непустое VALUE из массива мультиполя Битрикс (EMAIL/PHONE), иначе null. */
const firstValue = (multi: any): string | null => {
  if (!Array.isArray(multi) || multi.length === 0) return null;
  return multi[0]?.VALUE || null;
};

/** Сумма Битрикс приходит строкой; пустое/нечисловое → null. */
const parseAmount = (raw: any): number | null => {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};
