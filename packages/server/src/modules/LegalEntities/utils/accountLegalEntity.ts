// © 2026 Bigfin
/**
 * Юрлицо у счёта (этап 8 ТЗ, §8.1).
 *
 * ТЗ говорит «при создании счёта — обязательный выбор юрлица». Буквальное
 * прочтение ломает другое требование того же блока: приёмка §8.5 требует,
 * чтобы «организация с одним юрлицом не видела никаких изменений в
 * интерфейсе». Выбор из одного варианта — это и есть изменение, причём
 * бессмысленное.
 *
 * Поэтому правило такое: пока юрлицо одно, оно подставляется само; как только
 * их становится больше — выбор обязателен.
 */

export interface LegalEntityChoice {
  id: number;
  active: boolean;
  isPrimary: boolean;
}

export interface AccountLegalEntityDecision {
  /** Какое юрлицо проставить счёту. */
  legalEntityId: number | null;
  /** Нужно ли спросить человека (выбор не сделан, а вариантов несколько). */
  mustAsk: boolean;
}

/**
 * Решает, какое юрлицо у счёта и надо ли спрашивать.
 *
 * @param chosen - что выбрал человек (или ничего)
 * @param entities - справочник юрлиц организации
 */
export function decideAccountLegalEntity(
  chosen: number | null | undefined,
  entities: LegalEntityChoice[] | undefined,
): AccountLegalEntityDecision {
  const active = (entities ?? []).filter((entity) => entity.active);

  // Явный выбор уважаем всегда — даже если юрлицо одно.
  if (chosen != null) {
    return { legalEntityId: Number(chosen), mustAsk: false };
  }

  // Справочника нет вовсе (старая база до этапа 6) — ведём себя как раньше.
  if (active.length === 0) {
    return { legalEntityId: null, mustAsk: false };
  }

  if (active.length === 1) {
    return { legalEntityId: active[0].id, mustAsk: false };
  }

  // Юрлиц несколько, выбор не сделан — угадывать нельзя: ошибка тут
  // разводит остатки по юрлицам, и заметят её через месяц.
  return { legalEntityId: null, mustAsk: true };
}

/**
 * Можно ли менять юрлицо у существующего счёта.
 *
 * Нельзя, если по счёту уже есть операции: они наследовали юрлицо от него,
 * и смена задним числом разведёт остатки — часть операций окажется у одного
 * юрлица, часть у другого, а баланс ни у кого не сойдётся.
 */
export function canChangeAccountLegalEntity(
  transactionsCount: number | null | undefined,
): boolean {
  // Неизвестное число операций считаем «есть»: запретить смену дешевле,
  // чем потом сводить разъехавшиеся остатки.
  if (transactionsCount == null) return false;

  const count = Number(transactionsCount);
  if (!Number.isFinite(count)) return false;

  return count === 0;
}
