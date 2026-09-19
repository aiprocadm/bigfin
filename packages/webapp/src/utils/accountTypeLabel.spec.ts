import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ACCOUNT_TYPE } from '@/constants/accountTypes';

/**
 * С1 карты v29. Тип счёта подписан по-русски.
 *
 * В плане счетов столбец «ТИП» показывал английские подписи сервера:
 * «Cost of Goods Sold», «Equity», «Accounts Receivable». Названия счетов
 * при этом переведены — получалась вывеска на русском с подписью на чужом
 * языке. Продукт нацелен на предпринимателя без бухгалтерского
 * образования: `Equity` ему не говорит ничего.
 *
 * Правило: подпись типа берётся из словаря по ключу типа
 * (`cost-of-goods-sold` → `account_type.cost_of_goods_sold`), а не из поля
 * `account_type_label`, которое сервер отдаёт по-английски.
 */
const SRC = path.resolve(__dirname, '..');

const dictionary = (lang: string) =>
  JSON.parse(
    fs.readFileSync(path.join(SRC, `lang/${lang}/index.json`), 'utf8'),
  ) as Record<string, string>;

const TYPES = Object.values(ACCOUNT_TYPE) as string[];

describe('словарь типов счетов', () => {
  it('типы счетов найдены', () => {
    // Иначе проверки ниже стали бы пустыми и зелёными.
    expect(TYPES.length).toBeGreaterThanOrEqual(20);
  });

  it('у каждого типа есть подпись в обоих словарях', () => {
    const ru = dictionary('ru');
    const en = dictionary('en');

    const missing = TYPES.filter((type) => {
      const key = `account_type.${type.replace(/-/g, '_')}`;
      return !ru[key] || !en[key];
    });

    expect(missing).toEqual([]);
  });

  it('русская подпись написана по-русски, а не латиницей', () => {
    const ru = dictionary('ru');

    const latin = TYPES.filter((type) => {
      const value = ru[`account_type.${type.replace(/-/g, '_')}`] ?? '';
      return !/[А-Яа-яЁё]/.test(value);
    });

    expect(latin).toEqual([]);
  });
});

describe('подпись типа счёта', () => {
  it('берётся из словаря по ключу типа', async () => {
    vi.resetModules();
    vi.doMock('react-intl-universal', () => ({
      default: { get: (key: string) => (key === 'account_type.cost_of_goods_sold' ? 'Себестоимость продаж' : '') },
    }));
    const { accountTypeLabel } = await import('./accountTypeLabel');

    expect(accountTypeLabel('cost-of-goods-sold')).toBe('Себестоимость продаж');
  });

  it('без перевода показывает то, что дал сервер, а не пустоту', async () => {
    vi.resetModules();
    vi.doMock('react-intl-universal', () => ({
      default: { get: () => '' },
    }));
    const { accountTypeLabel } = await import('./accountTypeLabel');

    // Неизвестный витрине тип (сервер добавил новый) не должен исчезать
    // с экрана: показываем серверную подпись, пусть и английскую.
    expect(accountTypeLabel('brand-new-type', 'Brand New Type')).toBe(
      'Brand New Type',
    );
  });

  it('пустой тип не роняет экран', async () => {
    vi.resetModules();
    vi.doMock('react-intl-universal', () => ({
      default: { get: () => '' },
    }));
    const { accountTypeLabel } = await import('./accountTypeLabel');

    expect(accountTypeLabel(null)).toBe('');
  });
});

describe('английская подпись сервера не попадает на экран', () => {
  const sourceFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      if (!/\.(ts|tsx)$/.test(entry.name)) return [];
      if (/\.spec\.tsx?$/.test(entry.name)) return [];
      return [full];
    });

  it('никто не показывает account_normal_formatted напрямую', () => {
    // Симметрия правила. Сторона счёта приходит с сервера теми же
    // английскими словами («Debit», «Credit»), и показывать её как есть —
    // ровно та же ошибка, что и с типом. Найдено обходом ответов сервера:
    // карточка счёта показывала оба поля сразу.
    const offenders: string[] = [];

    sourceFiles(SRC).forEach((file) => {
      const code = fs.readFileSync(file, 'utf8');

      const showsInMarkup = code
        .split('\n')
        .some(
          (line) =>
            /\{[^}]*\.account_normal_formatted\b/.test(line) &&
            // Проверка НАЛИЧИЯ значения — не показ: `{x ? (…) : null}`
            // ничего на экран не выводит. Без этой оговорки сторож
            // краснеет на собственном исправленном файле.
            !/account_normal_formatted\s*\?/.test(line) &&
            !/accountNormalLabel\(/.test(line),
        );

      if (showsInMarkup) offenders.push(path.relative(SRC, file));
    });

    expect(offenders).toEqual([]);
  });

  it('никто не показывает account_type_label напрямую', () => {
    const offenders: string[] = [];

    sourceFiles(SRC).forEach((file) => {
      const code = fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');

      // Объявления типа в интерфейсах (`account_type_label: string`)
      // разрешены — поле в ответе сервера остаётся. Запрещён именно ПОКАЗ:
      // столбец таблицы по этому полю и подстановка в разметку.
      // СЛЕПОЕ ПЯТНО, НАЙДЕННОЕ ОБХОДОМ: правило требовало, чтобы поле
      // стояло ВПЛОТНУЮ к закрывающей скобке. А в карточке счёта было
      // `{account.account_type_label || EMPTY_VALUE}` — и сторож молчал,
      // пока на экране висело английское «Accounts Receivable».
      //
      // Теперь запрещён любой показ поля в разметке; объявления в описаниях
      // типов и передача его помощнику перевода по-прежнему разрешены.
      const showsInMarkup = code
        .split('\n')
        .some(
          (line) =>
            /\{[^}]*\.account_type_label\b/.test(line) &&
            // Проверка наличия значения — не показ.
            !/account_type_label\s*\?/.test(line) &&
            !/accountTypeLabel\(/.test(line),
        );

      const shown =
        /accessor:\s*['"]account_type_label['"]/.test(code) || showsInMarkup;

      if (shown) offenders.push(path.relative(SRC, file));
    });

    expect(offenders).toEqual([]);
  });
});
