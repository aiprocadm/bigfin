// © 2026 Bigfin
import {
  buildContactRequisitesLine,
  buildContactShippingAddress,
  buildOrganizationAddress,
  buildOrgRequisitesLine,
  formatInnKpp,
  hasGoodsEntries,
  isSoleProprietorInn,
  mapEntriesToRuVatLines,
  stripHtmlToText,
} from './ruFormMapping';

describe('stripHtmlToText', () => {
  it('превращает разметку addressTextFormatted в строку через запятую', () => {
    expect(
      stripHtmlToText(
        '<strong>ООО «Ромашка»</strong><br />ул. Ленина, д. 1<br />Москва 101000<br />Россия',
      ),
    ).toBe('ООО «Ромашка», ул. Ленина, д. 1, Москва 101000, Россия');
  });

  it('пустые значения → пустая строка', () => {
    expect(stripHtmlToText('')).toBe('');
    expect(stripHtmlToText(undefined as any)).toBe('');
  });
});

describe('buildOrganizationAddress', () => {
  it('берёт структурные поля address и не включает название', () => {
    expect(
      buildOrganizationAddress({
        name: 'ООО «Ромашка»',
        address: {
          postalCode: '101000',
          stateProvince: 'Москва',
          city: 'Москва',
          address1: 'ул. Ленина, д. 1',
        },
      }),
    ).toBe('101000, Москва, Москва, ул. Ленина, д. 1');
  });

  it('без структурных полей — разбирает addressTextFormatted и отрезает название', () => {
    expect(
      buildOrganizationAddress({
        name: 'ООО «Ромашка»',
        addressTextFormatted:
          '<strong>ООО «Ромашка»</strong><br />ул. Ленина, д. 1<br />Россия',
      }),
    ).toBe('ул. Ленина, д. 1, Россия');
  });

  it('пустые метаданные → пустая строка', () => {
    expect(buildOrganizationAddress({})).toBe('');
    expect(buildOrganizationAddress(undefined)).toBe('');
  });
});

describe('buildContactShippingAddress', () => {
  it('берёт адрес доставки, когда он заполнен', () => {
    expect(
      buildContactShippingAddress({
        shippingAddressPostcode: '141000',
        shippingAddressCity: 'г. Мытищи',
        billingAddressCity: 'г. Москва',
      }),
    ).toBe('141000, г. Мытищи');
  });

  it('падает на платёжный адрес, если адреса доставки нет', () => {
    expect(
      buildContactShippingAddress({
        billingAddressPostcode: '101000',
        billingAddressCity: 'г. Москва',
      }),
    ).toBe('101000, г. Москва');
  });
});

describe('formatInnKpp', () => {
  it('организация — «ИНН / КПП»', () => {
    expect(formatInnKpp('7707083893', '770701001')).toBe(
      '7707083893 / 770701001',
    );
  });

  it('ИП без КПП — только ИНН, без слэша', () => {
    expect(formatInnKpp('500100732259', '')).toBe('500100732259');
    expect(formatInnKpp('500100732259', undefined)).toBe('500100732259');
  });

  it('оба пусты → пустая строка', () => {
    expect(formatInnKpp(undefined, undefined)).toBe('');
  });
});

describe('isSoleProprietorInn', () => {
  it('12 цифр — ИП', () => {
    expect(isSoleProprietorInn('500100732259')).toBe(true);
  });

  it('10 цифр — организация', () => {
    expect(isSoleProprietorInn('7707083893')).toBe(false);
  });

  it('пусто или мусор — не ИП', () => {
    expect(isSoleProprietorInn('')).toBe(false);
    expect(isSoleProprietorInn(undefined)).toBe(false);
    expect(isSoleProprietorInn('50010073225x')).toBe(false);
  });
});

describe('hasGoodsEntries', () => {
  it('есть товар — true', () => {
    expect(hasGoodsEntries([{ item: { type: 'inventory' } }])).toBe(true);
    expect(hasGoodsEntries([{ item: { type: 'non-inventory' } }])).toBe(true);
  });

  it('только услуги — false', () => {
    expect(hasGoodsEntries([{ item: { type: 'service' } }])).toBe(false);
  });

  it('строка без справочной позиции не считается товаром', () => {
    expect(hasGoodsEntries([{ description: 'Произвольная строка' }])).toBe(
      false,
    );
  });

  it('пустой список — false', () => {
    expect(hasGoodsEntries([])).toBe(false);
    expect(hasGoodsEntries(undefined as any)).toBe(false);
  });
});

describe('buildOrgRequisitesLine', () => {
  it('собирает название, ИНН/КПП, адрес и банковские реквизиты', () => {
    expect(
      buildOrgRequisitesLine({
        name: 'ООО «Ромашка»',
        inn: '7707083893',
        kpp: '770701001',
        address: { city: 'Москва' },
        bankName: 'ПАО СБЕРБАНК',
        bankAccount: '40702810400000000001',
        bankBik: '044525225',
        bankCorrespondentAccount: '30101810400000000225',
      }),
    ).toBe(
      'ООО «Ромашка», ИНН 7707083893, КПП 770701001, Москва, ' +
        'банк ПАО СБЕРБАНК, р/с 40702810400000000001, БИК 044525225, ' +
        'к/с 30101810400000000225',
    );
  });

  it('незаполненные реквизиты пропускаются', () => {
    expect(buildOrgRequisitesLine({ name: 'ИП Иванов' })).toBe('ИП Иванов');
    expect(buildOrgRequisitesLine({})).toBe('');
  });
});

describe('buildContactRequisitesLine', () => {
  it('собирает контрагента с переданным адресом', () => {
    expect(
      buildContactRequisitesLine(
        { displayName: 'ООО «Покупатель»', inn: '5001007322', kpp: '500101001' },
        '141000, г. Мытищи',
      ),
    ).toBe('ООО «Покупатель», ИНН 5001007322, КПП 500101001, 141000, г. Мытищи');
  });

  it('пустой контрагент → пустая строка', () => {
    expect(buildContactRequisitesLine(undefined, '')).toBe('');
  });
});

describe('mapEntriesToRuVatLines', () => {
  const vatEntry = {
    item: { name: 'Товар А', code: 'A-1' },
    quantity: 2,
    rate: 1500,
    taxRate: 20,
    taxAmount: 600,
    subtotalExcludingTax: 3000,
    subtotalInclusingTax: 3600,
  };

  it('раскладывает позицию с НДС', () => {
    const { lines } = mapEntriesToRuVatLines([vatEntry]);

    expect(lines[0]).toEqual({
      index: 1,
      title: 'Товар А',
      code: 'A-1',
      quantity: 2,
      quantityText: '2',
      priceExclVatText: '1 500,00',
      amountExclVat: 3000,
      amountExclVatText: '3 000,00',
      vatRateText: '20%',
      vatAmount: 600,
      vatAmountText: '600,00',
      amountInclVat: 3600,
      amountInclVatText: '3 600,00',
    });
  });

  it('позиция без налога помечается «Без НДС»', () => {
    const { lines, totalVatText, hasAnyVat } = mapEntriesToRuVatLines([
      { item: { name: 'Услуга' }, quantity: 1, rate: 1000 },
    ]);

    expect(lines[0].vatRateText).toBe('Без НДС');
    expect(lines[0].vatAmountText).toBe('Без НДС');
    expect(lines[0].amountExclVatText).toBe('1 000,00');
    expect(lines[0].amountInclVatText).toBe('1 000,00');
    expect(lines[0].code).toBe('');
    expect(totalVatText).toBe('Без НДС');
    expect(hasAnyVat).toBe(false);
  });

  it('итоги суммируются по позициям, количество тоже', () => {
    const mapped = mapEntriesToRuVatLines([
      vatEntry,
      {
        item: { name: 'Товар Б' },
        quantity: 3,
        rate: 500,
        taxRate: 10,
        taxAmount: 150,
        subtotalExcludingTax: 1500,
        subtotalInclusingTax: 1650,
      },
    ]);

    expect(mapped.totalQuantityText).toBe('5');
    expect(mapped.totalExclVatText).toBe('4 500,00');
    expect(mapped.totalVatText).toBe('750,00');
    expect(mapped.totalInclVatText).toBe('5 250,00');
    expect(mapped.hasAnyVat).toBe(true);
  });

  it('смешанные позиции: итог НДС считается, хотя часть строк без налога', () => {
    const mapped = mapEntriesToRuVatLines([
      vatEntry,
      { item: { name: 'Услуга' }, quantity: 1, rate: 1000 },
    ]);

    expect(mapped.lines[1].vatAmountText).toBe('Без НДС');
    expect(mapped.totalVatText).toBe('600,00');
    expect(mapped.totalInclVatText).toBe('4 600,00');
  });

  it('цена считается от суммы без НДС, а не от rate', () => {
    // Скидка строки: rate 1000 × 2 = 2000, но сумма без НДС 1800 → цена 900.
    const { lines } = mapEntriesToRuVatLines([
      {
        item: { name: 'Со скидкой' },
        quantity: 2,
        rate: 1000,
        subtotalExcludingTax: 1800,
        subtotalInclusingTax: 1800,
      },
    ]);

    expect(lines[0].priceExclVatText).toBe('900,00');
  });

  it('дробное количество печатается с запятой', () => {
    const { lines, totalQuantityText } = mapEntriesToRuVatLines([
      { item: { name: 'Кабель' }, quantity: 2.5, rate: 100 },
    ]);

    expect(lines[0].quantityText).toBe('2,5');
    expect(totalQuantityText).toBe('2,5');
  });

  it('нулевое количество не делит на ноль', () => {
    const { lines } = mapEntriesToRuVatLines([
      { item: { name: 'Пусто' }, quantity: 0, rate: 100 },
    ]);

    expect(lines[0].priceExclVatText).toBe('0,00');
  });

  it('пустой список — нулевые итоги', () => {
    const mapped = mapEntriesToRuVatLines([]);

    expect(mapped.lines).toEqual([]);
    expect(mapped.totalExclVatText).toBe('0,00');
    expect(mapped.totalInclVatText).toBe('0,00');
    expect(mapped.totalVatText).toBe('Без НДС');
  });
});
