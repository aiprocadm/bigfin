import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Отметка «операция внутри своей группы» в формах денег (остаток К2 ТЗ).
 *
 * ЗАЧЕМ СТОРОЖ. У этих форм БЕЛЫЙ СПИСОК полей: до сервера доезжает только
 * то, что явно перечислено в `payload`. Галочка, забытая в этом списке,
 * выглядит совершенно рабочей — нажимается, запоминается, форма сохраняется
 * без ошибок, — и просто ничего не делает.
 *
 * Это не выдумка: первая версия этой правки именно так и выглядела.
 */
const FORMS = [
  {
    name: 'Приход',
    form: 'MoneyInDialog/v2/MoneyInFormV2.tsx',
    schema: 'MoneyInDialog/v2/MoneyIn.zod.ts',
  },
  {
    name: 'Расход',
    form: 'MoneyOutDialog/v2/MoneyOutFormV2.tsx',
    schema: 'MoneyOutDialog/v2/MoneyOut.zod.ts',
  },
];

const read = (file: string) =>
  activeCode(fs.readFileSync(path.join(__dirname, file), 'utf8'));

describe('отметка «внутригрупповая» доходит до сервера', () => {
  FORMS.forEach((entry) => {
    it(`${entry.name}: галочка выведена на экран`, () => {
      expect(read(entry.form)).toContain('<IntercompanyField');
    });

    it(`${entry.name}: поле есть в схеме формы`, () => {
      // Поля, которого нет в схеме, форма не сохранит вовсе.
      expect(read(entry.schema)).toContain('is_intercompany');
    });

    it(`${entry.name}: поле попало в белый список отправки`, () => {
      // Главная проверка: без этой строки галочка — пустая кнопка.
      expect(read(entry.form)).toContain(
        'is_intercompany: Boolean(values.is_intercompany)',
      );
    });

    it(`${entry.name}: по умолчанию выключена`, () => {
      // Включённая отметка вычитает из отчёта настоящую выручку.
      expect(read(entry.form)).toContain('is_intercompany: false');
    });
  });

  it('проверка и правда читает формы', () => {
    FORMS.forEach((entry) => {
      expect(read(entry.form).length).toBeGreaterThan(2000);
    });
  });
});

describe('поля нет, пока юрлицо одно', () => {
  const field = activeCode(
    fs.readFileSync(
      path.resolve(__dirname, '../../components/legal-entities/IntercompanyField.tsx'),
      'utf8',
    ),
  );

  it('решение принимается общим правилом, а не своим', () => {
    // Требование §8.5: организация с одним юрлицом не видит никаких
    // изменений в интерфейсе. Второе правило разошлось бы с первым.
    expect(field).toContain('shouldShowLegalEntityBreakdown');
  });

  it('при одном юрлице не рисуется ничего', () => {
    expect(field).toContain('return null');
  });

  it('человеку объясняется, что это значит', () => {
    // Без пояснения галочка «внутригрупповая» — загадка: непонятно, что
    // изменится в отчётах.
    expect(field).toContain('intercompany.hint');
  });
});

describe('журнал проводок тоже умеет отмечать', () => {
  const read2 = (file: string) =>
    activeCode(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'));

  it('галочка есть в подвале формы', () => {
    expect(
      read2('Accounting/MakeJournal/MakeJournalFormFooterLeft.tsx'),
    ).toContain('<IntercompanyFieldLegacy');
  });

  it('поле есть в схеме и в умолчаниях', () => {
    expect(
      read2('Accounting/MakeJournal/MakeJournalEntries.schema.tsx'),
    ).toContain('is_intercompany');
    expect(read2('Accounting/MakeJournal/utils.tsx')).toContain(
      'is_intercompany: false',
    );
  });

  it('правило показа взято общее, а не написано заново', () => {
    // Две копии правила «когда показывать» однажды разойдутся, и выключатель
    // появится там, где юрлицо одно.
    const field = activeCode(
      fs.readFileSync(
        path.resolve(
          __dirname,
          '../../components/legal-entities/IntercompanyField.tsx',
        ),
        'utf8',
      ),
    );
    const uses = field.split('shouldShowLegalEntityBreakdown').length - 1;

    // Один ввоз и два вызова — по одному на каждый вид формы.
    expect(uses).toBeGreaterThanOrEqual(3);
  });
});
