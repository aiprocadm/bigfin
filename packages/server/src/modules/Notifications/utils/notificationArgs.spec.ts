// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import {
  buildNotificationArgs,
  formatNotificationDate,
  formatNotificationMoney,
} from './notificationArgs';
import { activeCode } from '../../../testing/activeCode';

const RU = { locale: 'ru', currencyCode: 'RUB' };
const EN = { locale: 'en', currencyCode: 'USD' };

// Примеры payload в той форме, в которой их реально кладут эвалуаторы
// (cashGapDecide / lowBalanceDecide / overdueDecide).
const SAMPLE_PAYLOADS: Record<string, Record<string, any>> = {
  cash_gap: { date: '2026-08-09', amount: 421161.41, daysFromStart: 2 },
  low_balance: {
    minAmount: 1000000,
    accounts: [
      { name: 'Касса', amount: 0 },
      { name: 'Расчётный счёт', amount: 500 },
    ],
  },
  overdue: {
    count: 1,
    total: 100000,
    top: [{ id: 1, amount: 100000, dueDate: '2026-06-20' }],
  },
};

describe('formatNotificationMoney', () => {
  it('форматирует рубли по-русски с символом валюты', () => {
    const out = formatNotificationMoney(421161.41, RU);
    expect(out).toContain('₽');
    expect(out).toContain('421');
    expect(out).toContain('161');
  });

  it('не навязывает копейки круглым суммам', () => {
    const out = formatNotificationMoney(100000, RU);
    expect(out).not.toContain(',00');
  });

  it('не падает на неизвестной валюте', () => {
    const out = formatNotificationMoney(10, { locale: 'ru', currencyCode: '??' });
    expect(out).toContain('10');
  });
});

describe('formatNotificationDate', () => {
  it('ISO-дата по-русски: ДД.ММ.ГГГГ', () => {
    expect(formatNotificationDate('2026-08-09', RU)).toBe('09.08.2026');
  });

  it('непонятная строка возвращается как есть', () => {
    expect(formatNotificationDate('скоро', RU)).toBe('скоро');
  });
});

describe('buildNotificationArgs', () => {
  it('cash_gap: дни берутся из daysFromStart, сумма и дата отформатированы', () => {
    const args = buildNotificationArgs('cash_gap', SAMPLE_PAYLOADS.cash_gap, RU);
    expect(args.days).toBe(2);
    expect(args.date).toBe('09.08.2026');
    expect(args.amount).toContain('₽');
  });

  it('low_balance: count из числа счетов, names перечислены', () => {
    const args = buildNotificationArgs('low_balance', SAMPLE_PAYLOADS.low_balance, RU);
    expect(args.count).toBe(2);
    expect(args.names).toBe('Касса, Расчётный счёт');
    expect(args.minAmount).toContain('₽');
  });

  it('low_balance: длинный список счетов сворачивается в «+N»', () => {
    const payload = {
      minAmount: 10,
      accounts: [{ name: 'А' }, { name: 'Б' }, { name: 'В' }, { name: 'Г' }, { name: 'Д' }],
    };
    const args = buildNotificationArgs('low_balance', payload, RU);
    expect(args.names).toBe('А, Б, В +2');
    expect(args.count).toBe(5);
  });

  it('overdue: сумма отформатирована', () => {
    const args = buildNotificationArgs('overdue', SAMPLE_PAYLOADS.overdue, EN);
    expect(args.count).toBe(1);
    expect(String(args.total)).toContain('100,000');
  });

  it('неизвестное событие возвращает payload без изменений', () => {
    const payload = { foo: 'bar' };
    expect(buildNotificationArgs('system.test', payload, RU)).toEqual(payload);
  });

  it('пустой payload не роняет сборку', () => {
    expect(() => buildNotificationArgs('cash_gap', null, RU)).not.toThrow();
  });
});

describe('шаблоны переводов и подстановки согласованы', () => {
  // Страховка от «через {days} дн.» с пустотой: каждый {placeholder} каждого
  // шаблона обязан присутствовать в аргументах, которые собирает
  // buildNotificationArgs из реального payload эвалуатора.
  const placeholders = (template: string): string[] =>
    Array.from(template.matchAll(/\{(\w+)\}/g)).map((m) => m[1]);

  it.each(['ru', 'en'])('%s: у каждого шаблона есть все поля', (lang) => {
    const file = path.join(__dirname, `../../../i18n/${lang}/notifications.json`);
    const templates = JSON.parse(activeCode(fs.readFileSync(file, 'utf8')));

    for (const eventType of Object.keys(SAMPLE_PAYLOADS)) {
      const args = buildNotificationArgs(
        eventType,
        SAMPLE_PAYLOADS[eventType],
        RU,
      );
      for (const key of ['title', 'body']) {
        const template = templates[`${eventType}.${key}`];
        expect(template).toBeDefined();
        for (const ph of placeholders(template)) {
          expect(args).toHaveProperty(ph);
          expect(String(args[ph])).not.toBe('');
        }
      }
    }
  });
});
