// © 2026 Bigfin

/**
 * Что НЕЛЬЗЯ отправлять во внешнюю модель (этап 13 ТЗ, §13.1 п. 2).
 *
 * Правило ТЗ: «В модель не уходят сырые операции, реквизиты, ФИО, назначения
 * платежей. Только агрегаты: суммы по статьям, по месяцам, по проектам, доли,
 * отклонения».
 *
 * Почему так строго. Отправка в модель — это отправка НАРУЖУ, на чужой
 * сервер. «Оплата Иванову И.И. по договору №14 за консультацию» — это данные
 * конкретного человека, и уйдут они навсегда: отозвать отправленное нельзя.
 * Агрегат «Консультационные услуги: 240 000 ₽ за квартал» отвечает на тот же
 * вопрос и никого не выдаёт.
 *
 * Список закрытый: разрешено только то, что перечислено явно. Обратный подход
 * («запрещаем известные плохие поля») пропустил бы первое же новое поле,
 * которое кто-нибудь добавит в агрегат, — и пропустил бы молча.
 */

/** Поля, которые можно отдавать модели. Всё остальное — нельзя. */
export const ALLOWED_AGGREGATE_FIELDS = [
  // Что за строка. Название статьи/проекта/направления — это справочник,
  // а не персональные данные.
  'label',
  'kind',
  'period',
  'month',
  'quarter',
  'year',
  // Числа.
  'amount',
  'previousAmount',
  'change',
  'changePercent',
  'share',
  'count',
  'currency',
  // Куда ведёт вывод (§13.1 п. 3 — каждый вывод кликабелен).
  'reportKey',
  'link',
] as const;

/**
 * Поля, которые встречаются в наших данных и которые нельзя отдавать наружу.
 *
 * Список нужен не для фильтрации (её делает разрешительный список выше), а
 * для ВНЯТНОЙ ОШИБКИ: «нашли назначение платежа» понятнее, чем «поле не
 * разрешено».
 */
export const BLACKLISTED_FIELDS = [
  // Назначение платежа — в нём открытым текстом всё: кому, за что, по какому
  // договору.
  'description',
  'note',
  'memo',
  'transactionNumber',
  'referenceNo',
  'paymentPurpose',
  // Люди и организации.
  'contactName',
  'customerName',
  'vendorName',
  'displayName',
  'firstName',
  'lastName',
  'fullName',
  'directorName',
  'email',
  'phone',
  // Реквизиты.
  'inn',
  'kpp',
  'ogrn',
  'bankDetails',
  'accountNumber',
  'legalAddress',
  'actualAddress',
] as const;

/**
 * Имена контейнеров: в них ничего не лежит, они только группируют строки.
 *
 * Держатся ОТДЕЛЬНО от списка полей, чтобы не размывать его: поле несёт
 * значение и может утечь, контейнер — нет. Смешай их в одну кучу — и через
 * год никто не вспомнит, почему `rows` разрешено рядом с `amount`.
 */
export const STRUCTURAL_KEYS = [
  'rows',
  'items',
  'series',
  'sections',
  'blocks',
  'total',
] as const;

const ALLOWED = new Set<string>([
  ...(ALLOWED_AGGREGATE_FIELDS as readonly string[]),
  ...(STRUCTURAL_KEYS as readonly string[]),
]);
const BLACKLISTED = new Set<string>(BLACKLISTED_FIELDS as readonly string[]);

export interface PrivacyViolation {
  /** Путь до поля, чтобы было понятно, откуда оно взялось. */
  path: string;
  field: string;
  /** Из чёрного списка — значит, знаем, что это за поле. */
  blacklisted: boolean;
}

/**
 * Ищет в данных всё, что нельзя отдавать модели.
 *
 * Возвращает НАХОДКИ, а не «да/нет»: разработчику, который добавил поле в
 * агрегат, нужно видеть, какое именно поле и где.
 */
export function findPrivacyViolations(
  data: unknown,
  path = '$',
): PrivacyViolation[] {
  if (Array.isArray(data)) {
    return data.flatMap((item, index) =>
      findPrivacyViolations(item, `${path}[${index}]`),
    );
  }
  if (!data || typeof data !== 'object') return [];

  const violations: PrivacyViolation[] = [];

  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (!ALLOWED.has(key)) {
      violations.push({
        path: `${path}.${key}`,
        field: key,
        blacklisted: BLACKLISTED.has(key),
      });

      // Внутрь запрещённого поля не идём: оно целиком не поедет.
      return;
    }
    violations.push(...findPrivacyViolations(value, `${path}.${key}`));
  });

  return violations;
}

/**
 * Пропускает данные дальше или ломает сборку промпта.
 *
 * Именно БРОСАЕТ, а не вычищает молча. Тихая вычистка означала бы, что
 * однажды промпт уедет без половины смысла и никто не заметит; а главное —
 * что настоящую утечку мы бы тоже «починили» незаметно для себя.
 */
export function assertNoPrivateData(data: unknown): void {
  const violations = findPrivacyViolations(data);

  if (violations.length === 0) return;

  const named = violations
    .slice(0, 10)
    .map((v) => `${v.path}${v.blacklisted ? ' (чёрный список)' : ''}`)
    .join(', ');

  throw new Error(
    `В данные для ИИ попали поля, которые нельзя отправлять наружу: ${named}`,
  );
}
