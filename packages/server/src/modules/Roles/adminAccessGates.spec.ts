// © 2026 Bigfin
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { ForbiddenException } from '@nestjs/common';
import { MongoAbility, createMongoAbility } from '@casl/ability';
import { PermissionGuard } from './Permission.guard';
import { REQUIRED_PERMISSION_KEY } from './RequirePermission.decorator';
import { AbilitySubject } from './Roles.types';
import { PreferencesAction } from '@/modules/Settings/Settings.types';
import { staffRolePermissions } from '@/database/tenant/seeds/core/20210812121909_seed_roles_permissions';

import { ImportController } from '@/modules/Import/Import.controller';
import { OrganizationController } from '@/modules/Organization/Organization.controller';
import { PdfTemplatesController } from '@/modules/PdfTemplate/PdfTemplates.controller';
import { activeCode } from '../../testing/activeCode';

/**
 * Группа «настройки и обслуживание» шага П1 карты v8.
 *
 * Здесь лежит то, что делают один раз и для всех: реквизиты организации,
 * шаблоны печатных форм и загрузка данных из файла. Пока эти ручки стояли без
 * спроса, приглашённый человек мог переписать реквизиты в счетах, подменить
 * шаблон печати и залить в организацию файл, который создаёт записи пачками.
 *
 * У импорта право самое сильное — «управление всем»: мастер импорта заводит
 * данные любого вида (контрагентов, товары, счета), поэтому мерить его правом
 * на что-то одно неверно.
 */

type Gate = {
  title: string;
  controller: any;
  handler: string;
  ability: string;
  subject: string;
};

const ADMIN_GATES: Gate[] = [
  // Загрузка данных из файла — заводит записи любого вида.
  {
    title: 'загрузить файл импорта',
    controller: ImportController,
    handler: 'fileUpload',
    ability: 'manage',
    subject: 'all',
  },
  {
    title: 'сопоставить колонки импорта',
    controller: ImportController,
    handler: 'mapping',
    ability: 'manage',
    subject: 'all',
  },
  {
    title: 'выполнить импорт',
    controller: ImportController,
    handler: 'import',
    ability: 'manage',
    subject: 'all',
  },

  // Реквизиты организации попадают во все документы и отчёты.
  {
    title: 'изменить реквизиты организации',
    controller: OrganizationController,
    handler: 'updateOrganization',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },

  // Шаблоны печатных форм — вид документов, которые уходят наружу.
  {
    title: 'завести шаблон печати',
    controller: PdfTemplatesController,
    handler: 'createPdfTemplate',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'изменить шаблон печати',
    controller: PdfTemplatesController,
    handler: 'editPdfTemplate',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'удалить шаблон печати',
    controller: PdfTemplatesController,
    handler: 'deletePdfTemplate',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'назначить шаблон печати основным',
    controller: PdfTemplatesController,
    handler: 'assignPdfTemplateAsDefault',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
];

const staffAbility = () =>
  createMongoAbility(
    staffRolePermissions()
      .filter((permission) => permission.value)
      .map((permission) => ({
        action: permission.ability,
        subject: permission.subject,
      })),
  );

const adminAbility = () => createMongoAbility([{ action: 'manage', subject: 'all' }]);

const contextFor = (gate: Gate, ability: MongoAbility) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ ability }) }),
    getHandler: () => gate.controller.prototype[gate.handler],
    getClass: () => gate.controller,
  }) as any;

const guard = () =>
  new PermissionGuard({
    getAllAndOverride: (key: string, targets: any[]) =>
      targets.map((target) => Reflect.getMetadata(key, target)).find(Boolean),
  } as any);

describe('настройки и обслуживание спрашивают права', () => {
  it.each(ADMIN_GATES)('$title — пометка стоит', (gate) => {
    const declared = Reflect.getMetadata(
      REQUIRED_PERMISSION_KEY,
      gate.controller.prototype[gate.handler],
    );

    expect({ title: gate.title, declared }).toEqual({
      title: gate.title,
      declared: { ability: gate.ability, subject: gate.subject },
    });
  });

  it.each(ADMIN_GATES)('$title — страж подключён', (gate) => {
    // Страж может стоять на контроллере или на самой ручке: у организации
    // рядом лежит её создание, где прав ещё нет, поэтому там он поручный.
    const guards: any[] = [
      ...(Reflect.getMetadata('__guards__', gate.controller) ?? []),
      ...(Reflect.getMetadata(
        '__guards__',
        gate.controller.prototype[gate.handler],
      ) ?? []),
    ];

    expect({
      title: gate.title,
      guarded: guards.some((item) => item === PermissionGuard),
    }).toEqual({ title: gate.title, guarded: true });
  });

  it.each(ADMIN_GATES)('$title — сотруднику отказ', (gate) => {
    expect(() => guard().canActivate(contextFor(gate, staffAbility()))).toThrow(
      ForbiddenException,
    );
  });

  it.each(ADMIN_GATES)('$title — владельцу можно', (gate) => {
    expect(guard().canActivate(contextFor(gate, adminAbility()))).toBe(true);
  });

  it('обработчики названы верно — иначе тест сторожит пустоту', () => {
    const missing = ADMIN_GATES.filter(
      (gate) => typeof gate.controller.prototype[gate.handler] !== 'function',
    ).map((gate) => `${gate.controller.name}.${gate.handler}`);

    expect(missing).toEqual([]);
  });
});

/**
 * Рабочие пространства — это сами организации пользователя, и проверка у них
 * своя: службы сверяют, что человек владелец ЭТОЙ организации, по системному
 * членству. Пометка права тут не подошла бы: удаление организации не входит
 * в набор прав внутри неё.
 *
 * Тест следит, чтобы эта проверка не пропала: без неё любой участник удалил бы
 * или выключил чужую организацию.
 */
describe('рабочие пространства защищены собственной проверкой владельца', () => {
  const WORKSPACE_COMMANDS = [
    'DeleteWorkspaceJob.service.ts',
    'InactivateWorkspace.service.ts',
  ];

  const commandsDir = path.resolve(
    __dirname,
    '..',
    'ee',
    'Workspaces',
    'commands',
  );

  it.each(WORKSPACE_COMMANDS)('%s сверяет владельца', (file) => {
    const text = activeCode(fs.readFileSync(path.join(commandsDir, file), 'utf8'));

    expect({
      file,
      checksOwner: text.includes("role !== 'owner'"),
      reportsError: text.includes('NOT_WORKSPACE_OWNER'),
    }).toEqual({ file, checksOwner: true, reportsError: true });
  });
});
