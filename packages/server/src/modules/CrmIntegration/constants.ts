/** Группа и ключи настроек CRM-интеграции (per-tenant Settings). */
export const CRM_SETTINGS_GROUP = 'crm';

export const CRM_SETTINGS_KEYS = {
  ACTIVE_CONNECTOR: 'active_connector',
  BITRIX24_WEBHOOK_URL: 'bitrix24_webhook_url',
  AMOCRM_SUBDOMAIN: 'amocrm_subdomain',
  AMOCRM_ACCESS_TOKEN: 'amocrm_access_token',
};

/** Ключ коннектора Битрикс24. */
export const BITRIX24_KEY = 'bitrix24';

/** Ключ коннектора amoCRM. */
export const AMOCRM_KEY = 'amocrm';

/** Таймаут REST-запросов к CRM, мс. */
export const CRM_REQUEST_TIMEOUT_MS = 15000;
