// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { formatNumber } from './format-number';
import { activeCode } from '../testing/activeCode';

/**
 * Формат денег НИГДЕ не собирается вручную (§5.2 ТЗ).
 *
 * НАЙДЕНО ЖИВЫМ ПРОХОДОМ, а не тестом. На главной странице рядом стояли
 * «1 749 839,09 ₽» и «0.00 RUB»: первая сумма шла через общий помощник,
 * вторая собиралась в одну строку прямо в службе главной страницы.
 *
 * Тест этого не видел и не мог: сумма пришла, поле заполнено, ошибок нет.
 * Нечитаемо — но «нечитаемо» проверяет только человек. Поэтому здесь сторож
 * на само ПРАВИЛО, а не на конкретное место.
 *
 * ТЗ говорит прямо: «Единый хелпер. Ни одного места, где формат собирается
 * вручную.»
 */

/** Приёмы, которыми деньги форматируют «на коленке». */
const HANDMADE = [
  // Число с двумя знаками, к которому дописали код валюты.
  /toFixed\(2\)\}\s*\$\{[^}]*[Cc]urrency/,
  // Собственный `Intl.NumberFormat` со стилем «валюта».
  /Intl\.NumberFormat\([^)]*\)[\s\S]{0,120}style:\s*'currency'/,
];

/** Места, где это законно. */
const ALLOWED = [
  // Сам общий помощник.
  'utils/format-number.ts',
  // Этот сторож.
  'utils/moneyFormatIsShared.spec.ts',
  // Сводка по деньгам: свой `Intl` с русской локалью, проверенный спекой.
  // Оставлен намеренно — он и был образцом правильного вывода.
  'modules/Dashboard/queries/GetMoneySummary.service.ts',
  // Деньги в уведомлениях: формат зависит от ЯЗЫКА ПОЛУЧАТЕЛЯ, а общий
  // помощник языка не знает — он знает валюту. Это единственное место на
  // все уведомления, то есть правило «одно место» соблюдено.
  'modules/Notifications/utils/notificationArgs.ts',
];

const SRC = path.resolve(__dirname, '..');

function sourceFiles(dir: string, acc: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(full, acc);
    if (/\.tsx?$/.test(entry.name)) acc.push(full);
  });

  return acc;
}

describe('деньги форматируются одним местом', () => {
  const files = sourceFiles(SRC);

  it('файлы вообще нашлись', () => {
    // Иначе спека молча позеленеет на пустом списке.
    expect(files.length).toBeGreaterThan(500);
  });

  it('никто не собирает формат денег вручную', () => {
    const offenders = files
      .map((file) => ({
        file: path.relative(SRC, file).split(path.sep).join('/'),
        // БЕЗ ПОЯСНЕНИЙ: этот сторож уже краснел на собственном
        // комментарии, который ЦИТИРУЕТ плохой формат. Комментарий
        // можно оставить, а правило убрать — значит проверять надо
        // код.
        source: activeCode(fs.readFileSync(file, 'utf8')),
      }))
      .filter((row) => !ALLOWED.includes(row.file))
      .filter((row) => HANDMADE.some((rule) => rule.test(row.source)))
      .map((row) => row.file);

    expect(offenders).toEqual([]);
  });

  it('список разрешённых не протух', () => {
    // Список исключений надо проверять В ОБЕ СТОРОНЫ: строка про файл,
    // который уже переведён на общий помощник, — такая же неправда, как
    // пропущенное нарушение.
    const stale = ALLOWED.filter(
      (rel) => !fs.existsSync(path.join(SRC, rel)),
    );

    expect(stale).toEqual([]);
  });

  it('общий помощник и правда даёт русский вид', () => {
    // Проверка САМОГО правила, а не только его соблюдения: иначе сторож
    // защищал бы помощника, который форматирует плохо.
    const result = formatNumber(1749839.09, {
      currencyCode: 'RUB',
      money: true,
    });

    expect(result).toContain('₽');
    expect(result).toContain(',');
    expect(result).not.toContain('RUB');
  });
});
