import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';
import { shouldShowLegalEntityBreakdown } from '@/containers/LegalEntities/legalEntityView';

/**
 * Колонка «Юрлицо» в плане счетов — правило «не навязывать» (остаток Ю5 ТЗ).
 *
 * ПРАВИЛО. Организация с одним юрлицом не должна видеть в интерфейсе никаких
 * следов группы (§8.5). Колонка с одним и тем же словом в каждой строке —
 * именно такой след: места занимает, а не сообщает ничего.
 *
 * ПОЧЕМУ ИМЕННО ПЛАН СЧЕТОВ. Юрлицо задаётся у СЧЁТА, и именно оно решает,
 * чьей считается каждая операция. Как только юрлиц больше одного, видеть эту
 * связь надо сразу — а не открывая каждый счёт по очереди.
 */
const source = activeCode(
  fs.readFileSync(
    path.join(__dirname, 'v2/useAccountsTableColumnsV2.tsx'),
    'utf8',
  ),
);

const entity = (id: number, active = true) =>
  ({ id, name: `Юрлицо ${id}`, active }) as any;

describe('колонка «Юрлицо» в плане счетов', () => {
  it('колонка объявлена', () => {
    expect(source).toContain("id: 'legal_entity'");
    expect(source).toContain('legal_entities.col.entity');
  });

  it('появляется только по общему правилу', () => {
    // Второе правило «когда показывать» однажды разойдётся с первым, и
    // колонка вылезет там, где юрлицо одно.
    expect(source).toContain('shouldShowLegalEntityBreakdown');
  });

  it('показывает название, а не номер', () => {
    // Номер юрлица человеку не говорит ничего.
    expect(source).toContain('entityNameById');
  });

  it('счёт без юрлица показывает прочерк, а не пустоту', () => {
    // Пустая ячейка читается как «ещё не загрузилось».
    expect(source).toContain("?? '—'");
  });

  it('проверка и правда читает файл', () => {
    expect(source.length).toBeGreaterThan(1000);
  });
});

describe('правило «не навязывать»', () => {
  it('одно юрлицо — колонки нет', () => {
    expect(shouldShowLegalEntityBreakdown([entity(1)])).toBe(false);
  });

  it('два юрлица — колонка есть', () => {
    expect(shouldShowLegalEntityBreakdown([entity(1), entity(2)])).toBe(true);
  });

  it('выключенное юрлицо не считается', () => {
    // Оно остаётся в базе ради прошлых операций, но разрез из-за него
    // навязывать не за что.
    expect(
      shouldShowLegalEntityBreakdown([entity(1), entity(2, false)]),
    ).toBe(false);
  });
});
