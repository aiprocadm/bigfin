// © 2026 Bigfin
/**
 * Юрлицо по умолчанию из реквизитов организации (этап 6 ТЗ, §6.3 шаг 2).
 *
 * Реквизиты лежат в СИСТЕМНОЙ схеме (`tenants_metadata`), а справочник юрлиц —
 * в ТЕНАНТНОЙ. Здесь только перекладывание одного в другое, без базы: почти
 * все ошибки такого переноса не падают, а тихо записывают в справочник
 * неверные реквизиты, с которыми потом уйдут печатные формы и отчётность.
 */

/** Что известно об организации (поля `tenants_metadata`). */
export interface OrganizationRequisites {
  name?: string | null;
  baseCurrency?: string | null;
  legalForm?: string | null;
  taxRegime?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  bankName?: string | null;
  bankBik?: string | null;
  bankAccount?: string | null;
  bankCorrespondentAccount?: string | null;
  signerDirectorName?: string | null;
}

export interface DefaultLegalEntityDraft {
  name: string;
  fullName: string | null;
  form: string;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  taxSystem: string | null;
  baseCurrency: string;
  directorName: string | null;
  bankDetails: Record<string, string> | null;
  ownershipShare: number;
  isPrimary: boolean;
  active: boolean;
  sortOrder: number;
}

/** Длина ИНН у индивидуального предпринимателя. */
const INN_LENGTH_ENTREPRENEUR = 12;

/** Форма, когда вывести её не из чего. Человек поправит её в справочнике. */
export const FALLBACK_FORM = 'ООО';

/** Название, когда у организации не заполнено даже оно. */
export const FALLBACK_NAME = 'Моя компания';

/**
 * Пустое поле — это null, а не пустая строка.
 *
 * Пустая строка в ИНН выглядит в справочнике как «заполнено», проходит мимо
 * взгляда и падает потом — на печатной форме или сверке с контрагентом.
 */
const orNull = (value?: string | null): string | null => {
  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Форма ведения дела.
 *
 * Если организация её уже указала — берём как есть, не умничаем. Иначе
 * выводим из длины ИНН: 12 цифр бывает только у предпринимателя, 10 — у
 * организации. Если и ИНН нет, ставим самую частую форму и показываем её
 * в справочнике, где её видно и можно поправить.
 */
export function deriveLegalForm(
  legalForm?: string | null,
  inn?: string | null,
): string {
  const explicit = orNull(legalForm);
  if (explicit) return explicit;

  const digits = orNull(inn);
  if (digits && digits.length === INN_LENGTH_ENTREPRENEUR) return 'ИП';

  return FALLBACK_FORM;
}

/**
 * Банковские реквизиты одним полем. Пусто — null, а не пустой объект:
 * пустой объект в справочнике читается как «реквизиты есть».
 */
export function buildBankDetails(
  requisites: OrganizationRequisites,
): Record<string, string> | null {
  const details: Record<string, string> = {};

  const put = (key: string, value?: string | null) => {
    const clean = orNull(value);
    if (clean) details[key] = clean;
  };

  put('bankName', requisites.bankName);
  put('bik', requisites.bankBik);
  put('account', requisites.bankAccount);
  put('correspondentAccount', requisites.bankCorrespondentAccount);

  return Object.keys(details).length > 0 ? details : null;
}

/**
 * Черновик юрлица по умолчанию: головное, доля владельца 100%.
 *
 * Доля именно 100: пока юрлицо одно, оно принадлежит владельцу целиком, и
 * консолидация (этап 7) не должна урезать его показатели.
 */
export function buildDefaultLegalEntity(
  requisites: OrganizationRequisites,
): DefaultLegalEntityDraft {
  const name = orNull(requisites.name) ?? FALLBACK_NAME;

  return {
    name,
    // Полное наименование организация отдельно не хранит — не выдумываем его
    // из короткого, иначе оно уедет в печатные формы как официальное.
    fullName: null,
    form: deriveLegalForm(requisites.legalForm, requisites.inn),
    inn: orNull(requisites.inn),
    kpp: orNull(requisites.kpp),
    ogrn: orNull(requisites.ogrn),
    taxSystem: orNull(requisites.taxRegime),
    baseCurrency: orNull(requisites.baseCurrency) ?? 'RUB',
    directorName: orNull(requisites.signerDirectorName),
    bankDetails: buildBankDetails(requisites),
    ownershipShare: 100,
    isPrimary: true,
    active: true,
    sortOrder: 0,
  };
}
