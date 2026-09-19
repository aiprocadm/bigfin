import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Сторож: путь, который зовёт витрина, есть на сервере.
 *
 * ЗАЧЕМ. Опечатка в адресе ручки — самая незаметная поломка в продукте.
 * Она не падает ни на одном прогоне: витрина проверяет свою половину,
 * сервер — свою, и обе половины зелёные. Экран просто ничего не показывает,
 * а человек думает, что данных нет.
 *
 * Так и случилось с раскрытием суммы в отчёте: витрина звала
 * `financial-reports/drill-down`, сервер отдавал
 * `financial-reports/chart/drill-down`. Панель не работала НИ РАЗУ с самого
 * появления, а 4000 проверок этого не видели.
 *
 * КАК РАБОТАЕТ. Сторож читает обе половины монорепо: собирает адреса из
 * `@Controller(...)` + `@Get/@Post/...` сервера и сравнивает с адресами,
 * которые витрина передаёт в `apiRequest.get(...)` и его собратья.
 *
 * ЧЕГО НЕ ЛОВИТ. Только адреса, написанные строкой целиком. Собранные из
 * кусков (`items/${id}`) пропускаются: подставить туда значение сторож не
 * может, а гадать — значит выдумывать ложные тревоги.
 */
const WEB_SRC = path.resolve(__dirname, '../..');
const SERVER_SRC = path.resolve(__dirname, '../../../../server/src');

/** Объекты, через которые витрина ходит на сервер. */
const CALL_RE =
  /\b(?:apiRequest|api|ApiService)\s*\.\s*(get|post|put|patch|delete)\(\s*['"`]([A-Za-z/][^'"`\n]*)/g;

const CONTROLLER_RE = /@Controller\(\s*'([^']*)'/;
const ROUTE_RE = /@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)')?\s*\)/g;

/**
 * Долг: адреса, которых на сервере нет, и это известно.
 *
 * Список — не разрешение, а список того, что ждёт починки или удаления.
 * Каждая строка обязана нести причину: без неё следующий не поймёт, можно
 * трогать или нельзя.
 */
const KNOWN_DEBT: Record<string, string> = {
  'GET organization/all':
    'у контроллера организации есть только `current`; списка организаций сервер не отдаёт вовсе',
  'POST projects':
    'раздел «Проекты» без серверной части — известный остаток ТЗ, контроллера нет вовсе',
  'POST subscription/license/payment':
    'старое действие Redux; живой путь оплаты — `subscription/lemon/checkout_url`, но у него другой состав данных',
  'POST views':
    'сервер отдаёт представления (`views/resource/:resourceModel`), но принимать новые не умеет',
};

/** Все файлы каталога с нужными расширениями. */
function collect(dir: string, exts: string[], acc: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);

    if (full.includes('node_modules')) return;
    if (entry.isDirectory()) {
      collect(full, exts, acc);
      return;
    }
    if (exts.some((ext) => entry.name.endsWith(ext))) acc.push(full);
  });

  return acc;
}

/**
 * Исходник без комментариев, но той же длины.
 *
 * ЗАЧЕМ. Между объектом и вызовом законно стоит пояснение:
 *
 *     apiRequest
 *       // почему адрес именно такой
 *       .get('...')
 *
 * Правило ниже ищет `apiRequest` и `.get(` рядом. Комментарий между ними
 * разрывает пару, и вызов становится для сторожа невидимым. Поймал это
 * мутацией: подмена адреса прошла мимо общей проверки.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(
      /(^|[^:])\/\/[^\n]*/g,
      (m, prefix) => prefix + ' '.repeat(m.length - prefix.length),
    );
}

/** Без ведущей и хвостовой косой черты: `/items` и `items` — один адрес. */
function normalize(route: string): string {
  return route.trim().replace(/^\/+|\/+$/g, '');
}

interface ServerRoute {
  method: string;
  matches: (candidate: string) => boolean;
}

/**
 * Адреса, которые сервер и правда отдаёт.
 *
 * Контроллеры ищем ПО СОДЕРЖИМОМУ (`@Controller(`), а не по имени файла.
 * Первая версия собирала только `*.controller.ts` — и пропустила
 * `AuthApiKeys.controllers.ts` (имя во множественном числе). Из-за этого
 * существующая ручка «выдать ключ API» попала в список долга как
 * несуществующая. Сторож, который врёт в свою пользу, хуже отсутствующего.
 */
function serverRoutes(): ServerRoute[] {
  const routes: ServerRoute[] = [];

  collect(SERVER_SRC, ['.ts']).forEach((file) => {
    if (/\.spec\.ts$/.test(file)) return;

    const source = fs.readFileSync(file, 'utf8');

    if (!source.includes('@Controller(')) return;
    const controller = CONTROLLER_RE.exec(source);

    if (!controller) return;

    const prefix = normalize(controller[1]);

    ROUTE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = ROUTE_RE.exec(source)) !== null) {
      const tail = normalize(match[2] ?? '');
      const full = normalize([prefix, tail].filter(Boolean).join('/'));

      // Кусок вида `:id` подставляется на ходу — на его месте
      // подходит любое значение без косой черты.
      const pattern = new RegExp(
        '^' +
          full
            .split('/')
            .map((part) =>
              part.startsWith(':')
                ? '[^/]+'
                : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            )
            .join('/') +
          '$',
      );

      routes.push({
        method: match[1].toUpperCase(),
        matches: (candidate: string) => pattern.test(candidate),
      });
    }
  });

  return routes;
}

interface ClientCall {
  key: string;
  file: string;
}

/** Адреса, которые зовёт витрина, — только написанные строкой целиком. */
function clientCalls(): ClientCall[] {
  const seen = new Map<string, string>();

  collect(WEB_SRC, ['.ts', '.tsx']).forEach((file) => {
    if (/\.spec\.|__tests__/.test(file)) return;

    const source = withoutComments(fs.readFileSync(file, 'utf8'));

    CALL_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = CALL_RE.exec(source)) !== null) {
      const route = normalize(match[2].split('?')[0]);

      // Адрес собран из кусков — подставить значение нечем.
      if (!route || route.includes('${') || route.includes('+')) continue;

      const key = `${match[1].toUpperCase()} ${route}`;

      if (!seen.has(key)) seen.set(key, path.relative(WEB_SRC, file));
    }
  });

  return Array.from(seen, ([key, file]) => ({ key, file }));
}

describe('адрес, который зовёт витрина, есть на сервере', () => {
  const routes = serverRoutes();
  const calls = clientCalls();

  it('обе половины монорепо и правда прочитаны', () => {
    // Иначе сравнение ниже стало бы пустым и зелёным.
    expect(routes.length).toBeGreaterThan(300);
    expect(calls.length).toBeGreaterThan(100);
  });

  it('новых расхождений не появилось', () => {
    const broken = calls
      .filter(({ key }) => {
        const [method, route] = key.split(' ');

        return !routes.some((r) => r.method === method && r.matches(route));
      })
      .filter(({ key }) => !(key in KNOWN_DEBT))
      .map(({ key, file }) => `${key} <- ${file}`);

    expect(broken).toEqual([]);
  });

  it('долг не разрастается', () => {
    // Список известных расхождений может только уменьшаться.
    expect(Object.keys(KNOWN_DEBT)).toHaveLength(4);
  });

  it('каждая строка долга объясняет причину', () => {
    // Строка без причины бесполезна: следующий не поймёт, чинить или нет.
    Object.entries(KNOWN_DEBT).forEach(([key, reason]) => {
      expect(reason.length, key).toBeGreaterThan(20);
    });
  });

  it('контроллер с нестандартным именем файла тоже найден', () => {
    // `AuthApiKeys.controllers.ts` — имя во множественном числе. Первая
    // версия сторожа собирала только `*.controller.ts` и записала живую
    // ручку в долг как несуществующую.
    expect(
      routes.some((r) => r.method === 'POST' && r.matches('api-keys/generate')),
    ).toBe(true);
  });

  it('пояснение между объектом и вызовом не прячет адрес', () => {
    // Слепое пятно, найденное мутацией: `\s*` не переступает комментарий.
    const sample = [
      'apiRequest',
      "  // почему адрес именно такой",
      "  .get('no-such-route')",
    ].join('\n');

    CALL_RE.lastIndex = 0;

    expect(CALL_RE.test(withoutComments(sample))).toBe(true);
  });

  it('раскрытие суммы зовёт настоящий адрес', () => {
    // Именно эта опечатка и породила сторожа.
    const panel = fs.readFileSync(
      path.join(WEB_SRC, 'containers/FinancialStatements/ReportDrillDownPanel.tsx'),
      'utf8',
    );

    expect(panel).toContain('financial-reports/chart/drill-down');
  });
});
