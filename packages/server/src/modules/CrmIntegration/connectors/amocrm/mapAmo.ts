import { CrmContact, CrmDeal } from '../../types';

/**
 * Чистый маппинг сырого контакта amoCRM (`GET /api/v4/contacts`) в CrmContact.
 * amoCRM: имя в `name`, email/телефон — в `custom_fields_values` по `field_code`
 * ('EMAIL'/'PHONE'), значения в `values[].value`.
 */
export const mapAmoContact = (raw: any): CrmContact => {
  const externalId = String(raw.id);
  return {
    externalId,
    displayName: raw.name || `Контакт ${externalId}`,
    inn: cfValue(raw, 'INN'),
    email: cfValue(raw, 'EMAIL'),
    phone: cfValue(raw, 'PHONE'),
    companyName: null,
  };
};

/**
 * Чистый маппинг сырой сделки amoCRM (`GET /api/v4/leads`) в CrmDeal.
 * `price` — сумма, `closed_at` — Unix-секунды, связанный контакт — в
 * `_embedded.contacts[0].id`.
 */
export const mapAmoLead = (raw: any): CrmDeal => {
  const externalId = String(raw.id);
  const contact = raw?._embedded?.contacts?.[0]?.id;

  return {
    externalId,
    name: raw.name || `Сделка ${externalId}`,
    amount: typeof raw.price === 'number' ? raw.price : null,
    contactExternalId: contact != null ? String(contact) : null,
    closedAt: unixToIso(raw.closed_at),
  };
};

/** Значение пользовательского поля amoCRM по `field_code` (первое), иначе null. */
const cfValue = (raw: any, code: string): string | null => {
  const fields = raw?.custom_fields_values;
  if (!Array.isArray(fields)) return null;
  const field = fields.find((f: any) => f?.field_code === code);
  return field?.values?.[0]?.value ?? null;
};

/** Unix-секунды → ISO-строка; пусто → null. */
const unixToIso = (sec: any): string | null => {
  if (sec == null || typeof sec !== 'number') return null;
  return new Date(sec * 1000).toISOString();
};
