// © 2026 Bigfin
/**
 * Правила показа справочника юрлиц (этап 6 ТЗ, §6.4).
 *
 * Главное правило этапа со стороны интерфейса: **пока юрлицо одно, раздел не
 * навязывается**. Колонки «Юрлицо» и фильтры по нему не показываются нигде —
 * человеку, у которого одна фирма, они только мешают. Появляются, когда
 * появляется второе юрлицо.
 */

export interface LegalEntityRow {
  id: number;
  name: string;
  fullName: string | null;
  form: string;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  taxSystem: string | null;
  vatPayer: boolean;
  baseCurrency: string | null;
  directorName: string | null;
  legalAddress: string | null;
  actualAddress: string | null;
  bankDetails: Record<string, unknown> | null;
  ownershipShare: number;
  isPrimary: boolean;
  active: boolean;
  accountsCount: number;
}

const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

/**
 * Юрлицо из списка — в значения формы.
 *
 * ПОЧЕМУ ВАЖНО ПЕРЕНОСИТЬ ВСЁ. Форма отправляет на сервер все свои поля
 * разом. Поле, которое здесь забыли, уйдёт пустым — и сервер честно затрёт
 * настоящее значение. Так терялись КПП, ОГРН, директор и адрес: человек
 * правил название, а пропадали реквизиты, и ничто об этом не сообщало.
 */
export function legalEntityToForm(entity: LegalEntityRow) {
  const bank = (entity.bankDetails ?? {}) as Record<string, unknown>;

  return {
    name: entity.name,
    fullName: text(entity.fullName),
    form: entity.form,
    inn: text(entity.inn),
    kpp: text(entity.kpp),
    ogrn: text(entity.ogrn),
    taxSystem: text(entity.taxSystem),
    vatPayer: Boolean(entity.vatPayer),
    baseCurrency: text(entity.baseCurrency),
    directorName: text(entity.directorName),
    legalAddress: text(entity.legalAddress),
    actualAddress: text(entity.actualAddress),
    bankName: text(bank.bankName),
    bik: text(bank.bik),
    account: text(bank.account),
    correspondentAccount: text(bank.correspondentAccount),
    ownershipShare: String(entity.ownershipShare ?? 100),
    isPrimary: entity.isPrimary,
    active: entity.active,
  };
}

/**
 * Значения формы — в то, что ждёт сервер.
 *
 * Банковские поля собираются в ОДИН объект: сервер хранит их вместе, и
 * печатные формы читают оттуда же. Пустые не кладём вовсе — пустая строка
 * в реквизите выглядит как «заполнено» и ломает печатную форму.
 */
export function legalEntityFromForm(values: Record<string, any>) {
  const bankDetails: Record<string, string> = {};

  const put = (key: string, value: unknown) => {
    const clean = text(value).trim();

    if (clean) bankDetails[key] = clean;
  };

  put('bankName', values.bankName);
  put('bik', values.bik);
  put('account', values.account);
  put('correspondentAccount', values.correspondentAccount);

  const {
    bankName: _bankName,
    bik: _bik,
    account: _account,
    correspondentAccount: _correspondentAccount,
    ...rest
  } = values;

  return {
    ...rest,
    // Доля уходит числом: запятую с цифрового блока сервер не поймёт.
    ownershipShare: Number(String(values.ownershipShare).replace(',', '.')),
    bankDetails: Object.keys(bankDetails).length > 0 ? bankDetails : null,
  };
}

/**
 * Показывать ли разрез по юрлицу в остальных разделах.
 *
 * Считаем ДЕЙСТВУЮЩИЕ юрлица: выключенное остаётся в базе ради прошлых
 * операций, но разрез из-за него навязывать не за что.
 */
export function shouldShowLegalEntityBreakdown(
  entities: LegalEntityRow[] | undefined,
): boolean {
  const active = (entities ?? []).filter((entity) => entity.active);
  return active.length > 1;
}

/**
 * Можно ли удалить юрлицо прямо из списка.
 *
 * Кнопку прячем там, где сервер всё равно откажет: у юрлица с закреплёнными
 * счетами и у единственного. Показать кнопку, которая всегда отвечает
 * отказом, — это обещание, которого интерфейс не держит.
 *
 * Полной проверки здесь нет и быть не может: операции висят не только на
 * счетах. Последнее слово за сервером, здесь — только очевидные случаи.
 */
export function canDeleteLegalEntity(
  entity: LegalEntityRow,
  entities: LegalEntityRow[] | undefined,
): boolean {
  if ((entities ?? []).length <= 1) return false;
  return entity.accountsCount === 0;
}

/**
 * Доля владельца строкой.
 *
 * Целую долю показываем без хвоста: «100%», а не «100.00%». Хвост из нулей
 * создаёт впечатление точности, которой в доле владения обычно нет, и мешает
 * глазу в таблице, где почти у всех стоит ровно сто.
 */
export function formatOwnershipShare(share: number): string {
  const rounded = Math.round(Number(share ?? 0) * 100) / 100;
  return `${rounded}%`;
}
