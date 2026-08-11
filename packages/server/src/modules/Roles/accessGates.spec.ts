// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * Сверка «граница доступа объявлена ↔ страж, который её исполняет, подключён».
 *
 * Пометка без стража ничего не значит: она просто лежит в коде, а запрос
 * проходит. Этот класс уже ловился на флагах модулей, и здесь он опаснее —
 * речь о том, кто кому что может сделать.
 *
 * Отдельно тест закрепляет самое опасное из найденного живой пробой: роли,
 * состав участников и закрытие периода. Пока стояли без охраны, участник с
 * ролью «Сотрудник» создавал себе роль с любыми правами и закрывал период
 * всей организации — а закрытый период запрещает править документы ВСЕМ,
 * включая владельца.
 */
const MODULES_DIR = path.resolve(__dirname, '..');

/** Что обязано быть закрыто и чем именно. */
const MUST_BE_GUARDED: Record<string, 'owner' | 'permission'> = {
  'Roles/Roles.controller.ts': 'owner',
  'UsersModule/Users.controller.ts': 'owner',
  'UsersModule/UsersInvite.controller.ts': 'owner',
  'TransactionsLocking/TransactionsLocking.controller.ts': 'permission',
};

/**
 * Мнимая защита: право объявлено, стража нет — запрос проходит.
 *
 * Найдено этим же тестом при заведении: девять контроллеров. Все закрыты
 * (шаг П6 карты v8), список пуст и должен таким остаться.
 *
 * Список может только сокращаться. Новый контроллер в него добавлять нельзя:
 * ставя пометку права, ставьте и стража.
 */
const PERMISSION_MARK_WITHOUT_GUARD: string[] = [];

const controllerFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return controllerFiles(full);
    return entry.name.endsWith('.controller.ts') ? [full] : [];
  });

const read = (rel: string) =>
  fs.readFileSync(path.join(MODULES_DIR, rel), 'utf8');

describe('границы доступа исполняются, а не только объявлены', () => {
  const files = controllerFiles(MODULES_DIR);

  it('контроллеры найдены', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('пометка «только владелец» всегда идёт со своим стражем', () => {
    const empty = files.filter((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return text.includes('@RequireOwner(') && !text.includes('OwnerGuard');
    });

    expect(empty.map((f) => path.relative(MODULES_DIR, f))).toEqual([]);
  });

  it('пометка права всегда идёт со своим стражем', () => {
    const empty = files
      .filter((file) => {
        const text = fs.readFileSync(file, 'utf8');
        return (
          text.includes('@RequirePermission(') &&
          !text.includes('PermissionGuard')
        );
      })
      .map((f) => path.relative(MODULES_DIR, f).split(path.sep).join('/'));

    // Новых быть не должно: список известных может только сокращаться.
    expect(
      empty.filter((rel) => !PERMISSION_MARK_WITHOUT_GUARD.includes(rel)),
    ).toEqual([]);
  });

  it('список мнимой защиты не разросся и не выдуман', () => {
    const empty = files
      .filter((file) => {
        const text = fs.readFileSync(file, 'utf8');
        return (
          text.includes('@RequirePermission(') &&
          !text.includes('PermissionGuard')
        );
      })
      .map((f) => path.relative(MODULES_DIR, f).split(path.sep).join('/'));

    // Каждая запись обязана соответствовать живому нарушению: как только
    // контроллер починен, его надо убрать из списка, иначе список врёт.
    const stale = PERMISSION_MARK_WITHOUT_GUARD.filter(
      (rel) => !empty.includes(rel),
    );

    expect({ stale, count: empty.length }).toEqual({
      stale: [],
      count: PERMISSION_MARK_WITHOUT_GUARD.length,
    });
  });

  it('самое опасное закрыто и остаётся закрытым', () => {
    const unguarded = Object.entries(MUST_BE_GUARDED).filter(([rel, kind]) => {
      const text = read(rel);
      return kind === 'owner'
        ? !(text.includes('@RequireOwner(') && text.includes('OwnerGuard'))
        : !(
            text.includes('@RequirePermission(') &&
            text.includes('PermissionGuard')
          );
    });

    expect(unguarded.map(([rel]) => rel)).toEqual([]);
  });

  it('у закрытия периода охраняется каждая изменяющая ручка', () => {
    const text = read('TransactionsLocking/TransactionsLocking.controller.ts');
    const writes = (text.match(/@Put\(/g) ?? []).length;
    const marks = (text.match(/@RequirePermission\(/g) ?? []).length;

    expect({ writes, marks }).toEqual({ writes, marks: writes });
  });

  it('у состава участников охраняется каждая изменяющая ручка', () => {
    const text = read('UsersModule/Users.controller.ts');
    const writes = (text.match(/@(Put|Delete|Post|Patch)\(/g) ?? []).length;
    const marks = (text.match(/@RequireOwner\(/g) ?? []).length;

    expect({ writes, marks }).toEqual({ writes, marks: writes });
  });
});
