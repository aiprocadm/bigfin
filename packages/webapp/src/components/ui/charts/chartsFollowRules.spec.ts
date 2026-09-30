import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Девять правил графиков (§6.1 ТЗ-4, UI-046-2) — для КАЖДОГО файла,
 * который рисует через Recharts. Общий набор `components/ui/charts/` сам
 * правила задаёт и из проверки исключён.
 *
 * До этапа 46: расход красным на двух графиках, сглаженная линия маржи
 * рисовала волны 0 → 100 % → 0, подписи водопада под углом −25° и обрезаны,
 * «1600000» на осях, цвет `#e0a800` зашит в файл.
 */
const SRC = path.resolve(__dirname, '../../..');
const KIT = path.relative(SRC, __dirname).split(path.sep).join('/');

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : files(full);
    return /\.tsx?$/.test(entry.name) && !/\.(spec|test|stories)\./.test(entry.name) ? [full] : [];
  });
}

export const chartFiles = () =>
  files(SRC)
    .map((full) => ({
      file: path.relative(SRC, full).split(path.sep).join('/'),
      code: activeCode(fs.readFileSync(full, 'utf8')),
    }))
    .filter(({ file, code }) => !file.startsWith(KIT) && /from 'recharts'/.test(code));

/** Парето — единственный законный график с двумя осями Y (правило 8). */
const PARETO = ['containers/Homepage/TopContractorsSection.tsx'];

/** Нарушения одного файла — чистая функция, чтобы проверить сторожа на образце. */
export function chartViolations(file: string, code: string): string[] {
  const out: string[] = [];
  // 1. Цвет — только из темы.
  if (/#[0-9a-fA-F]{3,8}\b/.test(code)) out.push('цвет значением (#…)');
  if (/var\(--/.test(code)) out.push('цвет переменной в обход темы');
  if (/\b(?:fill|stroke)="(?!transparent|none)[^"]*"/.test(code)) out.push('цвет строкой в fill/stroke');
  // 2. Ось денег и подсказка — из набора.
  for (const m of code.matchAll(/<YAxis\b[^>]*?\/?>/gs)) {
    if (!/tickFormatter=/.test(m[0]) && !/hide/.test(m[0])) out.push('ось Y без форматера набора');
  }
  if (/<Tooltip\b/.test(code) && !/content=\{\s*<ChartTooltip/.test(code)) out.push('подсказка не ChartTooltip');
  // 3. Без сглаживания.
  if (/type=["'{](?:monotone|basis|natural|cardinal|bump)/.test(code)) out.push('сглаженная линия');
  // 4. Разрыв, а не ноль.
  if (/connectNulls(?!=\{false\})/.test(code)) out.push('connectNulls — ноль вместо разрыва');
  // 6. Подписи не наклоняются.
  if (/\bangle=/.test(code)) out.push('наклонные подписи');
  // 7. Бублик — не больше пяти долей.
  if (/<Pie\b/.test(code) && !/topSlices\(/.test(code)) out.push('круговая без topSlices');
  // 8. Две оси Y — только у Парето.
  if ((code.match(/<YAxis\b/g) ?? []).length > 1 && !PARETO.includes(file)) out.push('две оси Y');
  // 9. Каждый график — в ChartCard.
  if (!/\bChartCard\b/.test(code)) out.push('график не в ChartCard');
  return out;
}

describe('графики следуют девяти правилам', () => {
  it('сторож ловит подсаженные нарушения', () => {
    const bad = `import { Line } from 'recharts';
      <Tooltip /> <YAxis /> <Line type="monotone" stroke="#e0a800" connectNulls />
      <XAxis angle={-25} />`;
    const found = chartViolations('x.tsx', bad);
    expect(found).toEqual(
      expect.arrayContaining([
        'цвет значением (#…)',
        'цвет строкой в fill/stroke',
        'ось Y без форматера набора',
        'подсказка не ChartTooltip',
        'сглаженная линия',
        'connectNulls — ноль вместо разрыва',
        'наклонные подписи',
        'график не в ChartCard',
      ]),
    );
  });

  it('графики найдены (сторож не пустой)', () => {
    expect(chartFiles().length).toBeGreaterThanOrEqual(8);
  });

  it('ни один график не нарушает правил', () => {
    const broken = chartFiles().flatMap(({ file, code }) =>
      chartViolations(file, code).map((rule) => `${file}: ${rule}`),
    );
    expect(broken).toEqual([]);
  });
});
