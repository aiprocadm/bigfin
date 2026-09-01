// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { MODULE_ALLOWLIST } from './Features.constants';
import { FeaturesConfigure } from './FeaturesConfigure';
import { activeCode } from '../../testing/activeCode';

/**
 * Сверка «что сервер разрешает включать ↔ что показано в Настройки → Модули».
 *
 * Разведка v15 нашла класс ошибки: список модулей в интерфейсе и серверный
 * allowlist — два независимых списка, руками, без единой точки правды. Они
 * разошлись, и два полностью написанных модуля (быстрый ввод из Telegram,
 * импорт из 1С) остались без тумблера: включить их можно было только прямым
 * вызовом API.
 *
 * Расхождение не видно ни глазами, ни типами: лишний ключ в интерфейсе даёт
 * карточку, которая на нажатие отвечает 400, а недостающий — молча прячет
 * готовый модуль.
 */
const WEBAPP = path.resolve(__dirname, '../../../../webapp/src');
const MODULES_PAGE = path.join(
  WEBAPP,
  'containers/Preferences/Modules/ModulesPage.tsx',
);
const LANG = (locale: string) => path.join(WEBAPP, `lang/${locale}/index.json`);

/** Код без комментариев: закомментированный модуль — не показанный модуль. */
const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/**
 * Ключи модулей из списков `features: [...]` страницы «Модули».
 * Берём именно содержимое списков, а не блок между соседними константами:
 * имена групп в выборку не попадают, а переименование соседа не превращает
 * сторожа в молчаливо-зелёный.
 */
const uiModuleKeys = (): string[] => {
  const source = code(activeCode(fs.readFileSync(MODULES_PAGE, 'utf-8')));
  const lists = Array.from(source.matchAll(/features:\s*\[([^\]]*)\]/g));

  expect(lists.length).toBeGreaterThan(0);

  return lists.flatMap((list) =>
    Array.from(list[1].matchAll(/'([a-z0-9_]+)'/g)).map((m) => m[1]),
  );
};

/** Ключи, у которых на странице задана иконка. */
const uiIconKeys = (): string[] => {
  const source = code(activeCode(fs.readFileSync(MODULES_PAGE, 'utf-8')));
  const start = source.indexOf('const MODULE_ICONS');
  const block = source.slice(start, source.indexOf('};', start));

  return Array.from(block.matchAll(/^\s{2}([a-z0-9_]+):/gm)).map((m) => m[1]);
};

describe('список модулей в интерфейсе совпадает с серверным', () => {
  it('страница модулей на месте', () => {
    // Тест ходит в соседний пакет: пусть падает громко, а не скипается тихо.
    expect(fs.existsSync(MODULES_PAGE)).toBe(true);
  });

  it('в интерфейсе показаны ровно те модули, что разрешает сервер', () => {
    const ui = uiModuleKeys();
    const missingInUi = MODULE_ALLOWLIST.filter((f) => !ui.includes(f));
    const extraInUi = ui.filter((key) => !MODULE_ALLOWLIST.includes(key));

    expect({ missingInUi, extraInUi }).toEqual({
      missingInUi: [],
      extraInUi: [],
    });
  });

  it('в списках нет повторов', () => {
    // Повтор в allowlist не виден глазом, а на странице даст две карточки.
    const dup = (list: string[]) =>
      list.filter((key, i) => list.indexOf(key) !== i);

    expect({
      server: dup(MODULE_ALLOWLIST),
      ui: dup(uiModuleKeys()),
    }).toEqual({ server: [], ui: [] });
  });

  it('у каждого модуля есть иконка', () => {
    // Без иконки карточка рисуется молча кривой: `Icon ? ... : null`.
    const icons = uiIconKeys();

    expect(MODULE_ALLOWLIST.filter((f) => !icons.includes(f))).toEqual([]);
  });

  it('каждый переключаемый модуль объявлен в реестре фич', () => {
    // Иначе включение вернёт 400 «нет такой фичи» уже после клика.
    const registered = new FeaturesConfigure({
      get: () => undefined,
    } as unknown as ConfigService)
      .getConfigure()
      .map((f) => f.name as string);

    expect(MODULE_ALLOWLIST.filter((f) => !registered.includes(f))).toEqual([]);
  });

  it.each(['ru', 'en'])(
    'у каждого модуля есть название и описание в локали %s',
    (locale) => {
      const lang = JSON.parse(activeCode(fs.readFileSync(LANG(locale), 'utf-8')));
      const missing = MODULE_ALLOWLIST.flatMap((f) =>
        [`modules.${f}.label`, `modules.${f}.desc`].filter(
          (key) => !lang[key],
        ),
      );

      expect(missing).toEqual([]);
    },
  );
});
