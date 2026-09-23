// © 2026 Bigfin
import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createMongoAbility } from '@casl/ability';
import { PermissionGuard } from './Permission.guard';
import { AbilitySubject, ExportAction } from './Roles.types';
import { AbilitySchema } from './AbilitySchema';
import { asksForSpreadsheet } from './utils/exportRight';
import { ReportsAction } from '@/modules/FinancialStatements/types/Report.types';
import { ExportController } from '@/modules/Export/Export.controller';
import { OnecExportController } from '@/modules/OnecExport/OnecExport.controller';
import { BalanceSheetStatementController } from '@/modules/FinancialStatements/modules/BalanceSheet/BalanceSheet.controller';
import { staffRolePermissions } from '@/database/tenant/seeds/core/20210812121909_seed_roles_permissions';

/**
 * FT-082 ТЗ-3: выгрузка данных — отдельное право.
 *
 * AC: пользователь без права не видит кнопку экспорта, и `GET /export`
 * возвращает 403. Сюда же — таблица любого отчёта: Excel и CSV отдаёт та же
 * ручка, что и экран, по заголовку `Accept`.
 */
const guard = new PermissionGuard(new Reflector());

function run(controller: any, handler: string, rules: any[], accept?: string) {
  const request: any = {
    headers: accept ? { accept } : {},
    ability: createMongoAbility(rules),
  };
  const context: any = {
    getHandler: () => controller.prototype[handler],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  };
  return () => guard.canActivate(context);
}

const READ_BALANCE = { action: ReportsAction.READ_BALANCE_SHEET, subject: AbilitySubject.Report };
const EXPORT = { action: ExportAction.Run, subject: AbilitySubject.Export };

describe('право «Выгрузка данных»', () => {
  it('таблицей считаются Excel и CSV, но не PDF и не экран', () => {
    expect(asksForSpreadsheet('application/xlsx')).toBe(true);
    expect(asksForSpreadsheet('application/csv, */*')).toBe(true);
    expect(asksForSpreadsheet('application/pdf')).toBe(false);
    expect(asksForSpreadsheet('application/json')).toBe(false);
    expect(asksForSpreadsheet(undefined)).toBe(false);
  });

  it('AC: GET /export и /export/all без права — 403, с правом — пускают', () => {
    for (const handler of ['export', 'exportAll']) {
      expect(run(ExportController, handler, [READ_BALANCE])).toThrow(ForbiddenException);
      expect(run(ExportController, handler, [EXPORT])()).toBe(true);
    }
  });

  it('выписка для 1С — та же выгрузка и то же право', () => {
    expect(run(OnecExportController, 'export', [])).toThrow(ForbiddenException);
    expect(run(OnecExportController, 'export', [EXPORT])()).toBe(true);
  });

  it('отчёт на экране — по праву отчёта; таблицей — нужно ещё право выгрузки', () => {
    const handler = 'balanceSheet';
    expect(run(BalanceSheetStatementController, handler, [READ_BALANCE], 'application/json')()).toBe(true);
    expect(run(BalanceSheetStatementController, handler, [READ_BALANCE], 'application/pdf')()).toBe(true);
    expect(run(BalanceSheetStatementController, handler, [READ_BALANCE], 'application/xlsx')).toThrow(
      /Нет права на выгрузку/,
    );
    expect(run(BalanceSheetStatementController, handler, [READ_BALANCE, EXPORT], 'application/xlsx')()).toBe(true);
    // Право выгрузки не заменяет право на сам отчёт.
    expect(run(BalanceSheetStatementController, handler, [EXPORT], 'application/xlsx')).toThrow(ForbiddenException);
  });

  it('владелец («можно всё») выгружает без отдельной галочки', () => {
    expect(run(ExportController, 'exportAll', [{ action: 'manage', subject: 'all' }])()).toBe(true);
  });

  it('право есть в форме роли, а «Сотруднику» по умолчанию не выдано', () => {
    const subject = AbilitySchema.find((s) => s.subject === AbilitySubject.Export);
    expect(subject?.extraAbilities?.map((a) => a.key)).toEqual([ExportAction.Run]);
    expect(
      staffRolePermissions().some((p: any) => p.subject === AbilitySubject.Export),
    ).toBe(false);
  });
});
