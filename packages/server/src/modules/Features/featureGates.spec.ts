// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * Сверка «модуль за флагом ↔ сервер этот флаг проверяет».
 *
 * Приёмка на свежей организации показала расхождение: пункт меню спрятан за
 * флагом, а ручки того же модуля отвечают всем. Для чтения это просто
 * непоследовательно, для записи хуже: в организации с выключенным модулем
 * можно было изменить данные.
 *
 * Тест держит список тех, кто проверку ещё не завёл, — он может только
 * сокращаться. Новый модуль обязан либо повесить стража, либо осознанно
 * попасть в этот список с объяснением.
 */
const MODULES_DIR = path.resolve(__dirname, '..');

/** Ключи модулей, у которых серверной проверки пока нет — с причиной. */
const WITHOUT_GATE: Record<string, string> = {
  // Справочники и данные, которыми пользуются ДРУГИЕ включённые модули:
  // закрыть их ручку — сломать чужую страницу. Требует отдельного разбора.
  'ManagementArticles/ManagementArticles.controller.ts':
    'статьи учёта нужны бюджетам и финмодели',
  'Warehouses/Warehouses.controller.ts': 'склады выбираются в формах документов',
};

// Сделки закрыты (М2 карты v15). Прежняя причина «сделка выбирается в формах
// операций» устарела: список сделок запрашивает только сам раздел «Сделки»
// (в вебапе useDeals зовут лишь его страницы), а внутренние потребители —
// синхронизация с CRM — ходят в сервисы напрямую, мимо контроллера.

// Интеграции закрыты (2026-08-10). Решение: выключенный модуль ОСТАНАВЛИВАЕТ
// обмен, а не работает втихую. Это безопасно и предсказуемо: фоновых задач у
// интеграций нет — обмен идёт только по запросу, а настроить подключение можно
// лишь на странице модуля, то есть при включённом флаге. Значит, если обмен
// сегодня работает, флаг заведомо включён.

const controllerFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return controllerFiles(full);
    return entry.name.endsWith('.controller.ts') ? [full] : [];
  });

describe('модули за флагом проверяют флаг на сервере', () => {
  const files = controllerFiles(MODULES_DIR);

  it('контроллеры найдены', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it('список исключений не содержит выдуманных файлов', () => {
    // Иначе исключение переживёт сам контроллер и тихо ослабит проверку.
    const stale = Object.keys(WITHOUT_GATE).filter(
      (rel) => !fs.existsSync(path.join(MODULES_DIR, rel)),
    );

    expect(stale).toEqual([]);
  });

  it('в исключениях нет тех, у кого проверка уже есть', () => {
    const redundant = Object.keys(WITHOUT_GATE).filter((rel) => {
      const full = path.join(MODULES_DIR, rel);
      if (!fs.existsSync(full)) return false;
      const src = fs.readFileSync(full, 'utf8');
      return src.includes('RequireFeature') || src.includes('FeaturesManager');
    });

    expect(redundant).toEqual([]);
  });

  it('модули, помеченные стражем, действительно его подключают', () => {
    // `@RequireFeature` без `FeatureGuard` молча ничего не проверяет — самая
    // обидная ошибка, потому что выглядит как рабочая защита.
    const declaredButUnguarded = files
      .filter((file) => {
        const src = fs.readFileSync(file, 'utf8');
        return src.includes('@RequireFeature(') && !src.includes('FeatureGuard');
      })
      .map((file) => path.relative(MODULES_DIR, file));

    expect(declaredButUnguarded).toEqual([]);
  });
});
