// © 2026 Bigfin
import {
  CONFIDENCE_THRESHOLD,
  extractWords,
  suggestArticle,
  suggestByContact,
  suggestByWords,
  trainWordWeights,
} from './categorizationRules';

/**
 * Этап 12 ТЗ. Подсказка статьи по истории — локально, без внешнего ИИ.
 *
 * Главная опасность здесь не в том, что подсказка не появится, а в том, что
 * появится неверная: человек принимает её одним щелчком и получает неверный
 * отчёт, сам того не заметив. Поэтому почти все проверки — про молчание.
 */
const record = (contactId: number | null, note: string, articleId: number) => ({
  contactId,
  note,
  articleId,
});

describe('suggestByContact', () => {
  it('контрагент, чьи платежи шли в одну статью, даёт подсказку', () => {
    const history = [
      record(5, 'аренда офиса', 10),
      record(5, 'аренда офиса', 10),
      record(5, 'аренда офиса', 10),
    ];

    const suggestion = suggestByContact(5, history);

    expect(suggestion).toMatchObject({
      articleId: 10,
      reason: 'contact',
      matched: 3,
      total: 3,
    });
  });

  it('подсказку можно объяснить словами', () => {
    // «12 из 14 платежей этому контрагенту шли в эту статью» — именно это
    // отличает объяснимую подсказку от догадки.
    const history = Array.from({ length: 14 }, (_, index) =>
      record(5, 'платёж', index < 13 ? 10 : 20),
    );

    const suggestion = suggestByContact(5, history);

    expect(suggestion?.matched).toBe(13);
    expect(suggestion?.total).toBe(14);
  });

  it('разнобой в истории подсказки не даёт', () => {
    // Половина платежей в одну статью, половина в другую — угадывать нечего.
    const history = [
      record(5, 'платёж', 10),
      record(5, 'платёж', 20),
      record(5, 'платёж', 10),
      record(5, 'платёж', 20),
    ];

    expect(suggestByContact(5, history)).toBeNull();
  });

  it('малая история молчит', () => {
    // Две операции из двух дают «100% уверенности», которая ничего не значит.
    const history = [record(5, 'платёж', 10), record(5, 'платёж', 10)];

    expect(suggestByContact(5, history)).toBeNull();
  });

  it('чужая история не учитывается', () => {
    const history = [
      record(9, 'платёж', 10),
      record(9, 'платёж', 10),
      record(9, 'платёж', 10),
    ];

    expect(suggestByContact(5, history)).toBeNull();
  });

  it('без контрагента подсказки по контрагенту нет', () => {
    expect(suggestByContact(null, [])).toBeNull();
  });
});

describe('extractWords', () => {
  it('числа и короткие обрывки выбрасываются', () => {
    // Номер счёта и «ООО» встречаются везде и не отличают аренду
    // от закупки, зато уверенно засоряют модель.
    expect(extractWords('Оплата по счёту 12345 ООО Ромашка')).toEqual([
      'оплата',
      'счёту',
      'ромашка',
    ]);
  });

  it('пустое назначение не роняет разбор', () => {
    expect(extractWords(null)).toEqual([]);
    expect(extractWords('')).toEqual([]);
  });
});

describe('suggestByWords', () => {
  const history = [
    record(1, 'аренда помещения за январь', 10),
    record(1, 'аренда помещения за февраль', 10),
    record(2, 'закупка товара партия один', 20),
    record(2, 'закупка товара партия два', 20),
  ];

  it('узнаёт статью по словам назначения', () => {
    const weights = trainWordWeights(history);

    const suggestion = suggestByWords('аренда помещения за март', weights);

    expect(suggestion?.articleId).toBe(10);
  });

  it('незнакомое слово не обнуляет статью', () => {
    // Без сглаживания одно новое слово обнулило бы вероятность, и
    // классификатор молчал бы там, где мог подсказать.
    const weights = trainWordWeights(history);

    const suggestion = suggestByWords('аренда помещения зоопарка', weights);

    expect(suggestion?.articleId).toBe(10);
  });

  it('пустая модель молчит', () => {
    expect(suggestByWords('аренда', trainWordWeights([]))).toBeNull();
  });

  it('пустое назначение молчит', () => {
    expect(suggestByWords('', trainWordWeights(history))).toBeNull();
  });
});

describe('suggestArticle — итоговая подсказка', () => {
  const history = [
    record(5, 'аренда помещения', 10),
    record(5, 'аренда помещения', 10),
    record(5, 'аренда помещения', 10),
    record(7, 'закупка товара', 20),
    record(7, 'закупка товара', 20),
    record(7, 'закупка товара', 20),
  ];

  it('контрагент важнее слов', () => {
    // Совпадение по контрагенту объяснимо человеку, по словам — нет.
    // При равной пользе выбираем то, что можно объяснить.
    const suggestion = suggestArticle(
      { contactId: 7, note: 'аренда помещения' },
      history,
    );

    expect(suggestion?.reason).toBe('contact');
    expect(suggestion?.articleId).toBe(20);
  });

  it('без контрагента работают слова', () => {
    const suggestion = suggestArticle(
      { contactId: null, note: 'аренда помещения' },
      history,
    );

    expect(suggestion?.reason).toBe('words');
    expect(suggestion?.articleId).toBe(10);
  });

  it('ниже порога уверенности подсказки НЕТ вовсе', () => {
    // Правило ТЗ: «пользователь никогда не должен видеть неуверенную
    // догадку». Неверная подсказка хуже её отсутствия — её принимают
    // одним щелчком и получают неверный отчёт.
    //
    // Слова незнакомы обеим статьям, поэтому модель не может выбрать:
    // доли делятся поровну и до порога не дотягивают.
    expect(
      suggestArticle({ contactId: null, note: 'зоопарк карусель' }, history),
    ).toBeNull();
  });

  it('порог именно такой, как требует ТЗ', () => {
    // Значение порога — часть требования, а не деталь реализации.
    expect(CONFIDENCE_THRESHOLD).toBe(0.7);
  });

  it('пустая история молчит', () => {
    expect(suggestArticle({ contactId: 5, note: 'аренда' }, [])).toBeNull();
  });
});
