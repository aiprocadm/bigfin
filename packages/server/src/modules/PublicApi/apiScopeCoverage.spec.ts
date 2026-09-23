// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { API_SCOPES } from './utils/apiScopes';

/**
 * Сторож прав токена API (FT-091 ТЗ-3).
 *
 * 1. Каждая метка `@RequireApiScope('…')` — известное право: опечатка в
 *    метке молча закрыла бы ручку для всех токенов.
 * 2. Пишущей ручке не дано право «на чтение»: иначе токен «только
 *    отчёты» мог бы создавать операции.
 * 3. Ручки, на которых стоят инструменты будущего MCP-сервера (FT-090),
 *    открыты токену с нужным правом.
 */
const ROOT = path.resolve(__dirname, '..');

function controllers(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return controllers(full);
    return entry.name.endsWith('.controller.ts') ? [full] : [];
  });
}

const files = controllers(ROOT).map((file) => ({ file, source: fs.readFileSync(file, 'utf-8') }));

describe('права токена API на ручках', () => {
  it('метки есть, и каждая — известное право', () => {
    const used = files.flatMap(({ source }) => [...source.matchAll(/@RequireApiScope\('([^']+)'\)/g)].map((m) => m[1]));
    expect(used.length).toBeGreaterThan(40);
    const unknown = used.filter((scope) => !(API_SCOPES as readonly string[]).includes(scope));
    expect(unknown).toEqual([]);
  });

  it('пишущей ручке не дано право «на чтение»', () => {
    const offenders: string[] = [];
    for (const { file, source } of files) {
      const blocks = source.split(/\n(?=  @(?:Get|Post|Put|Patch|Delete)\()/);
      for (const block of blocks) {
        const write = /^  @(Post|Put|Patch|Delete)\(/.test(block);
        const scope = block.match(/@RequireApiScope\('([^']+)'\)/)?.[1];
        if (write && scope?.endsWith(':read')) offenders.push(`${path.relative(ROOT, file)} ${block.slice(0, 40)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it.each([
    ['FinancialStatements/modules/CashFlowArticles/CashFlowArticles.controller.ts', 'reports:read'],
    ['FinancialStatements/modules/ManagerialProfitLoss/ManagerialPnl.controller.ts', 'reports:read'],
    ['FinancialStatements/modules/BalanceSheet/BalanceSheet.controller.ts', 'reports:read'],
    ['PaymentCalendar/PaymentCalendar.controller.ts', 'reports:read'],
    ['Debts/Debts.controller.ts', 'reports:read'],
    ['BankingTransactions/controllers/BankingTransactions.controller.ts', 'transactions:read'],
    ['ManagementArticles/ManagementArticles.controller.ts', 'reports:read'],
    ['Budgets/Budgets.controller.ts', 'reports:read'],
  ])('ручка инструмента MCP открыта токену: %s', (file, scope) => {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf-8');
    expect(source).toContain(`@RequireApiScope('${scope}')`);
  });
});
