import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { activeCode } from '../testing/activeCode';

/**
 * FT-082 ТЗ-3. Кнопка выгрузки видна только тому, у кого есть право.
 *
 * Сервер отвечает 403 на любую таблицу (Excel, CSV), полную выгрузку и файл
 * для 1С, если у человека нет права «Выгрузка данных». Витрина на 403
 * открывает общий экран «нет доступа» — человек теряет экран, на котором
 * работал, из-за одной кнопки. Поэтому каждое место, откуда можно скачать
 * таблицу, обязано спросить `useCanExport()` и спрятать кнопку без права.
 *
 * Сторож находит такие места по признакам в действующем коде (комментарии
 * не в счёт) и требует в том же файле `useCanExport()`, результат которого
 * где-то используется. Новый экран с выгрузкой без проверки права покраснит
 * здесь.
 */
const SRC = path.resolve(__dirname, '..');
const CONTAINERS = path.join(SRC, 'containers');

const read = (relative: string) =>
  activeCode(fs.readFileSync(path.join(SRC, relative), 'utf8'));

/** Признаки того, что файл предлагает скачать таблицу или файл выгрузки. */
const EXPORT_MARKERS: { name: string; pattern: RegExp }[] = [
  // Диалог «Экспорт» списков: XLSX/CSV через GET /export.
  { name: 'диалог экспорта', pattern: /DialogsName\.Export\b/ },
  { name: 'useResourceExport', pattern: /\buseResourceExport\b/ },
  // Отчёты: хуки вида useBalanceSheetXlsxExport / useJournalSheetCsvExport.
  { name: 'хук XLSX/CSV отчёта', pattern: /\buse\w+(Xlsx|Csv)Export\b/ },
  // Легаси-панели отчётов показывают меню выгрузки во всплывашке.
  { name: 'меню выгрузки отчёта', pattern: /<\w+ExportMenu\b/ },
  // Полная выгрузка и файл для 1С.
  { name: 'полная выгрузка', pattern: /['"`]\/?export\/all['"`]/ },
  { name: 'выгрузка в 1С', pattern: /['"`]\/?onec-export['"`]/ },
  // Образца для загрузки здесь нет намеренно: в нём придуманные строки, а
  // не данные организации, и сервер отдаёт его без права (`@NotDataExport`).
];

/**
 * Сам диалог экспорта открывается только кнопками, которые проверены выше
 * по признаку `DialogsName.Export`, — своей кнопки у него нет.
 */
const EXCLUDED_DIRS = [path.join('containers', 'Dialogs', 'ExportDialog')];

function listTsx(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTsx(full);
    if (!entry.name.endsWith('.tsx')) return [];
    if (/\.(spec|test|stories)\.tsx$/.test(entry.name)) return [];
    return [full];
  });
}

/** Проверяет ли файл право — и пользуется ли ответом, а не просто зовёт хук. */
function honoursRight(code: string): boolean {
  const declared = code.match(/const\s+(\w+)\s*=\s*useCanExport\(\s*\)/);
  if (!declared) return false;
  const uses = code.match(new RegExp(`\\b${declared[1]}\\b`, 'g')) || [];
  return uses.length >= 2;
}

const exportFiles = listTsx(CONTAINERS)
  .map((full) => path.relative(SRC, full))
  .filter((relative) => !EXCLUDED_DIRS.some((dir) => relative.startsWith(dir)))
  .map((relative) => ({ relative, code: read(relative) }))
  .filter(({ code }) => EXPORT_MARKERS.some(({ pattern }) => pattern.test(code)));

describe('выгрузка таблицей — только с правом (FT-082)', () => {
  it('сторож находит места выгрузки, а не пустой список', () => {
    // На 23.09.2026 таких файлов 57. Запас — на слияние панелей при
    // переделке; если число упало сильно, сломался поиск, а не код.
    expect(exportFiles.length).toBeGreaterThanOrEqual(52);
  });

  it('каждое место выгрузки спрашивает право и прячет кнопку без него', () => {
    const unguarded = exportFiles
      .filter(({ code }) => !honoursRight(code))
      .map(({ relative }) => relative);

    expect(unguarded).toEqual([]);
  });

  it('общий тулбар отчётов сам прячет XLSX/CSV без права', () => {
    const toolbar = read('containers/FinancialStatements/v2/FinancialReportToolbar.tsx');

    expect(honoursRight(toolbar)).toBe(true);
  });

  it('пункты меню, ведущие на выгрузку, помечены правом', () => {
    const sidebar = read('constants/sidebarMenu.tsx');
    const onecEntry = sidebar.slice(sidebar.indexOf("href: '/onec-export'"));
    expect(onecEntry.slice(0, 400)).toMatch(/subject:\s*AbilitySubject\.Export/);

    const preferences = read('constants/preferencesMenu.tsx');
    const exportEntry = preferences.slice(
      preferences.indexOf("href: '/preferences/export-data'"),
    );
    expect(exportEntry.slice(0, 300)).toMatch(/subject:\s*AbilitySubject\.Export/);

    // Пометка без фильтра ничего не прячет.
    const preferencesSidebar = read('components/Preferences/PreferencesSidebar.tsx');
    expect(preferencesSidebar).toMatch(/permissionAllows\(/);
  });
});
