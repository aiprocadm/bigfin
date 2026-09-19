// © 2026 Bigfin

/**
 * Отбор отчёта по направлениям (остаток О6 ТЗ).
 *
 * Правило проще, чем у юрлиц, и это важно понимать. Юрлицо — часть УСТРОЙСТВА
 * группы: пустой выбор там означает «вся группа», и вдобавок надо исключать
 * внутренние переводы, чтобы не посчитать одни деньги дважды.
 *
 * Направление — просто ярлык. Пустой выбор означает «все операции, включая
 * непомеченные». Ничего исключать не нужно: перевод между направлениями — не
 * двойной счёт, а перекладывание внутри одного кармана.
 *
 * ОПЕРАЦИИ БЕЗ НАПРАВЛЕНИЯ ПРИ ОТБОРЕ ВЫПАДАЮТ, и это правильно: человек
 * спросил «сколько заработала розница», а не «сколько заработала розница плюс
 * всё непомеченное». Но знать об этом он должен — иначе итог отчёта окажется
 * меньше общего, и причина будет неочевидна.
 */
export interface ProjectScope {
  projectsIds?: number[] | null;
}

interface ScopedQuery {
  whereIn(column: string, values: readonly any[]): unknown;
}

/** Выбраны ли конкретные направления. */
export function hasProjectScope(scope: ProjectScope | undefined): boolean {
  return (scope?.projectsIds ?? []).length > 0;
}

/**
 * Накладывает отбор по направлениям на запрос проводок.
 *
 * Имя колонки берётся с приставкой, когда запрос идёт с соединением таблиц:
 * без неё MySQL не поймёт, о чьей колонке речь.
 */
export function applyProjectScope(
  query: ScopedQuery,
  scope: ProjectScope | undefined,
  columnPrefix = '',
): void {
  if (!hasProjectScope(scope)) return;

  const column = `${columnPrefix}project_id`;

  query.whereIn(column, (scope?.projectsIds ?? []).map(Number));
}

/** Пояснение для шапки отчёта: по каким направлениям он собран. */
export function describeProjectScope(scope: ProjectScope | undefined): {
  isFiltered: boolean;
  selectedCount: number;
  /** Операции без направления в отбор не попали. */
  excludesUnassigned: boolean;
} {
  const selected = scope?.projectsIds ?? [];

  return {
    isFiltered: selected.length > 0,
    selectedCount: selected.length,
    excludesUnassigned: selected.length > 0,
  };
}
