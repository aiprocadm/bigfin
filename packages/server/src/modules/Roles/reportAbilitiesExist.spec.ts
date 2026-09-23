// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { AbilitySchema } from './AbilitySchema';
import { AbilitySubject } from './Roles.types';
import { ReportsAction } from '@/modules/FinancialStatements/types/Report.types';
import { activeCode } from '../../testing/activeCode';

/**
 * FT-084 ТЗ-3: право на ручке обязано существовать в справочнике ролей.
 *
 * Пометка с правом, которого нет в форме роли, закрывает ручку для всех, кроме
 * владельца: выдать такое право некому и нечем. Живой случай этапа 39 — сделки
 * были помечены правом «прибыльность проектов», которое объявлено в перечне
 * отчётов, но в форму роли не вынесено ни разу.
 *
 * Сторож читает пометки с предметом «Отчёт» — именно там права строковые и
 * опечатку не поймает компилятор.
 */
const MODULES_DIR = path.resolve(__dirname, '..');

const files = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return entry.name.endsWith('.controller.ts') ? [full] : [];
  });

/** Строка права: 'read-x' или ReportsAction.READ_X. */
function resolveAbility(raw: string): string | null {
  const literal = raw.match(/^'([^']+)'$/);
  if (literal) return literal[1];
  const member = raw.match(/^ReportsAction\.([A-Z_]+)$/);
  if (member) return (ReportsAction as any)[member[1]] ?? `ReportsAction.${member[1]}`;
  return null;
}

export function reportAbilitiesUsed(source: string): string[] {
  const code = activeCode(source);
  const out: string[] = [];
  const forms = [
    /@RequirePermission\(\s*([^,()]+?)\s*,\s*AbilitySubject\.Report\s*\)/g,
    /\{\s*ability:\s*([^,{}]+?)\s*,\s*subject:\s*AbilitySubject\.Report\s*\}/g,
  ];
  for (const form of forms) {
    for (const m of code.matchAll(form)) {
      const ability = resolveAbility(m[1].trim());
      if (ability) out.push(ability);
    }
  }
  return out;
}

const grantable = new Set(
  AbilitySchema.filter((s) => s.subject === AbilitySubject.Report).flatMap((s) => [
    ...(s.abilities || []).map((a) => a.key),
    ...(s.extraAbilities || []).map((a) => a.key),
  ]),
);

describe('права отчётов на ручках есть в форме роли', () => {
  it('разбор видит обе формы пометки', () => {
    expect(
      reportAbilitiesUsed(
        "@RequirePermission(ReportsAction.READ_BALANCE_SHEET, AbilitySubject.Report)\n" +
          "@RequireAnyPermission({ ability: 'read-x', subject: AbilitySubject.Report })",
      ),
    ).toEqual(['read-balance-sheet', 'read-x']);
  });

  it('выдуманное право ловится', () => {
    const used = reportAbilitiesUsed(
      "@RequireAnyPermission({ ability: 'read-project-profitability-summary', subject: AbilitySubject.Report })",
    );
    expect(used.filter((a) => !grantable.has(a))).toEqual(['read-project-profitability-summary']);
  });

  it('каждое право отчёта на ручках можно выдать ролью', () => {
    const unknown: string[] = [];
    let total = 0;
    for (const file of files(MODULES_DIR)) {
      for (const ability of reportAbilitiesUsed(fs.readFileSync(file, 'utf8'))) {
        total += 1;
        if (!grantable.has(ability)) {
          unknown.push(`${path.relative(MODULES_DIR, file)}: ${ability}`);
        }
      }
    }
    expect(total).toBeGreaterThan(50);
    expect(unknown).toEqual([]);
  });
});
