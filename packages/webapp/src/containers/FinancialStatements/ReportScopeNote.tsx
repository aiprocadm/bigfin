// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';

/**
 * Пояснение в шапке отчёта: что именно сейчас показано (этап 7 ТЗ).
 *
 * ЗАЧЕМ. Сводный отчёт по группе и отчёт по одному юрлицу дают РАЗНЫЕ числа,
 * и оба правильные. Без подписи человек видит, что сумма не та, какую он
 * держал в голове, и решает, что программа врёт.
 *
 * Сервер считал это пояснение и раньше, но на экран его никто не выводил —
 * ещё одна возможность, существовавшая на бумаге.
 */
export interface LegalEntityScopeMeta {
  isConsolidated?: boolean;
  excludesIntercompany?: boolean;
  selectedCount?: number;
  hasIntercompanySettlement?: boolean;
}

export function ReportScopeNote({
  scope,
  /** Пояснять ли строку расчётов внутри группы — только у Баланса. */
  withBalanceWarning = false,
}: {
  scope?: LegalEntityScopeMeta;
  withBalanceWarning?: boolean;
}) {
  if (!scope) return null;

  // Одно юрлицо в организации — говорить не о чем: выбора не было.
  const isNarrowed = Number(scope.selectedCount ?? 0) > 0;

  if (!isNarrowed && !scope.excludesIntercompany) return null;

  return (
    <div className="mb-3 flex flex-col gap-1 text-xs text-text-secondary">
      {scope.excludesIntercompany && (
        <p>{intl.get('report.scope.excludes_intercompany')}</p>
      )}

      {/*
        ПОЯСНЕНИЕ, А НЕ ПРЕДУПРЕЖДЕНИЕ. Раньше здесь висела оговорка «стороны
        баланса могут не сойтись»: внутренний перевод оставлял вторую ногу у
        другого юрлица, и разница повисала в воздухе. Теперь разница
        показана строкой «Расчёты внутри группы», и объяснять надо уже её:
        откуда строка взялась и что значит её знак.
      */}
      {withBalanceWarning && scope.hasIntercompanySettlement && (
        <p>{intl.get('report.scope.intercompany_settlement')}</p>
      )}
    </div>
  );
}
