import { describe, expect, it, vi } from 'vitest';

import {
  parseAmountQuery,
  registryAmountLink,
  registryRowToCommand,
} from './commandPaletteSources';

describe('сумма в командной строке', () => {
  it('понимает разряды, копейки и знак рубля', () => {
    expect(parseAmountQuery('500000')).toBe(500000);
    expect(parseAmountQuery('500 000')).toBe(500000);
    // Неразрывный пробел — так разряды разделены в отчётах.
    expect(parseAmountQuery('1 612 400,50')).toBe(1612400.5);
    expect(parseAmountQuery('250000.5 ₽')).toBe(250000.5);
    expect(parseAmountQuery('1200 руб.')).toBe(1200);
  });

  it('текст и мусор — не сумма', () => {
    expect(parseAmountQuery('Ромашка')).toBeNull();
    expect(parseAmountQuery('ООО 12')).toBeNull();
    expect(parseAmountQuery('12,345')).toBeNull();
    expect(parseAmountQuery('0')).toBeNull();
    expect(parseAmountQuery('')).toBeNull();
  });

  it('ведёт в реестр ровно на эту сумму; без даты — за всё время', () => {
    expect(registryAmountLink(500000, '2026-09-19')).toBe(
      '/cashflow-accounts/transactions?fromDate=2026-09-19&toDate=2026-09-19&minAmount=500000&maxAmount=500000',
    );
    // Без периода реестр показал бы текущий месяц, и старая операция «не
    // нашлась» бы.
    expect(registryAmountLink(10)).toContain('fromDate=2000-01-01');
  });

  it('операция — со знаком, контрагентом, датой и счётом', () => {
    const navigate = vi.fn();
    const out = registryRowToCommand(
      {
        reference_type: 'CashflowTransaction',
        reference_id: 7,
        date: '2026-09-19',
        formatted_date: '19 сент. 2026',
        contact_name: 'ИП Демидов',
        account_name: 'Расчётный',
        deposit: 0,
        formatted_withdrawal: '500 000,00 ₽',
      },
      500000,
      'Операции',
      navigate,
    );

    expect(out.title).toBe('−500 000,00 ₽ · ИП Демидов');
    expect(out.subtitle).toBe('19 сент. 2026 · Расчётный');
    out.onSelect();
    expect(navigate).toHaveBeenCalledWith(registryAmountLink(500000, '2026-09-19'));
  });
});
