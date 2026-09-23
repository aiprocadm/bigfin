// © 2026 Bigfin
import { ManagerialPnlColumn, PnlNode } from './buildManagerialPnlReport';

/**
 * «ФОТ по сотрудникам» (FT-014 ТЗ-3): строка статьи зарплаты раскрывается
 * до сотрудников из утверждённых расчётов.
 *
 * ПОЧЕМУ ЕСТЬ СТРОКА-ОСТАТОК. Расчёт зарплаты в журнал не пишет: сумма
 * строки «Зарплата» — это операции по статье (оплаты из банка, ручные
 * проводки), а сотрудники — из расчётов. Они совпадают, только если всё
 * оплачено ровно по расчётам и в том же периоде. Поэтому под сотрудниками
 * всегда стоит «Остаток статьи вне расчётов зарплаты» = строка − сотрудники:
 * сумма раскрытия равна строке, а расхождение видно, а не спрятано.
 *
 * Сумма сотрудника — «на руки» (`net_amount`): именно её утверждение
 * расчёта ставит в платёжный календарь по статье зарплаты. НДФЛ и взносы
 * уходят на статью налогов и здесь не показываются.
 */

export interface EmployeePayroll {
  employeeId: number;
  name: string;
  amount: number;
}

export const PAYROLL_OTHER_SUFFIX = 'employee-other';
export const PAYROLL_OTHER_NAME = 'Остаток статьи вне расчётов зарплаты';

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Возвращает колонку, где у строки статьи зарплаты (в ярусе) появились
 * сотрудники и остаток. `employees` — сотрудники ЭТОЙ колонки; `roster` —
 * все сотрудники отчёта, чтобы строки были одинаковы во всех колонках.
 * Колонка не меняется, если статьи зарплаты в ярусах нет.
 */
export function expandPayrollByEmployees(
  column: ManagerialPnlColumn,
  payrollArticleId: number,
  employees: EmployeePayroll[],
  roster: Array<{ employeeId: number; name: string }>,
): { column: ManagerialPnlColumn; found: boolean } {
  const amountOf = new Map<number, number>();
  employees.forEach((employee) =>
    amountOf.set(
      employee.employeeId,
      (amountOf.get(employee.employeeId) ?? 0) + employee.amount,
    ),
  );
  const target = `article-${payrollArticleId}`;
  let found = false;

  const expand = (node: PnlNode): PnlNode => {
    const children = node.children.map(expand);
    // Только статья в ярусе: в «Не отнесено» знаки перевёрнуты, и
    // раскрытие там сбило бы с толку — сначала статье нужен ярус.
    if (node.id !== target || node.rowType !== 'ARTICLE' || !node.plType) {
      return { ...node, children };
    }
    found = true;
    const people: PnlNode[] = roster.map((person) => ({
      id: `${node.id}-employee-${person.employeeId}`,
      name: person.name,
      rowType: 'ARTICLE',
      amount: round2(amountOf.get(person.employeeId) ?? 0),
      children: [],
      plType: node.plType,
    }));
    const explained = [...children, ...people].reduce(
      (sum, child) => sum + (child.amount ?? 0),
      0,
    );
    const other: PnlNode = {
      id: `${node.id}-${PAYROLL_OTHER_SUFFIX}`,
      name: PAYROLL_OTHER_NAME,
      rowType: 'ARTICLE',
      amount: round2((node.amount ?? 0) - explained),
      children: [],
      plType: node.plType,
    };
    return { ...node, children: [...children, ...people, other] };
  };

  const rows = column.rows.map(expand);
  return { column: { ...column, rows }, found };
}
