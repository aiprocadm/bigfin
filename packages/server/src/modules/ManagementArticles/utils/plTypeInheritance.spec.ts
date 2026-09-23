// © 2026 Bigfin
import { resolvePlType } from './plTypes';

/**
 * Наследование яруса от родителя (FT-009 ТЗ-3).
 *
 * Правило одно на весь продукт: список статей и управленческий ОПиУ считают
 * действующий ярус этой же функцией.
 */
const articles = [
  { id: 1, parentId: null, plType: 'administrative' }, // «Расходы»
  { id: 2, parentId: 1, plType: null }, // подстатья человека
  { id: 3, parentId: 2, plType: null }, // подстатья подстатьи
  { id: 4, parentId: 1, plType: 'direct_variable' }, // свой ярус
  { id: 5, parentId: 1, plType: 'excluded' }, // выведена из отчёта
  { id: 6, parentId: 5, plType: null }, // дочь исключённой
  { id: 7, parentId: null, plType: null }, // корень без яруса
  { id: 8, parentId: 7, plType: null }, // дочь корня без яруса
];

describe('наследование яруса', () => {
  it('свой ярус главнее родительского', () => {
    expect(resolvePlType(4, articles)).toEqual({
      plType: 'direct_variable',
      inherited: false,
    });
  });

  it('пустой ярус берётся у родителя и помечается унаследованным', () => {
    expect(resolvePlType(2, articles)).toEqual({
      plType: 'administrative',
      inherited: true,
    });
  });

  it('поднимается через несколько поколений', () => {
    expect(resolvePlType(3, articles)).toEqual({
      plType: 'administrative',
      inherited: true,
    });
  });

  it('«не участвует» наследуется, как любой другой ярус', () => {
    expect(resolvePlType(6, articles)).toEqual({
      plType: 'excluded',
      inherited: true,
    });
  });

  it('не задан ни у кого в цепочке — не задан: без угадывания', () => {
    // Раздел 34 ТЗ-3: статья встанет строкой «Не отнесено к ярусу».
    expect(resolvePlType(8, articles)).toEqual({
      plType: null,
      inherited: false,
    });
    expect(resolvePlType(7, articles)).toEqual({
      plType: null,
      inherited: false,
    });
  });

  it('неизвестная статья — без яруса', () => {
    expect(resolvePlType(999, articles).plType).toBeNull();
  });

  it('испорченная цепочка родителей не зависает', () => {
    const cycle = [
      { id: 10, parentId: 11, plType: null },
      { id: 11, parentId: 10, plType: null },
    ];
    expect(resolvePlType(10, cycle).plType).toBeNull();
  });

  it('мусор в колонке яруса не считается ярусом', () => {
    const dirty = [
      { id: 20, parentId: null, plType: 'administrative' },
      { id: 21, parentId: 20, plType: '' },
    ];
    expect(resolvePlType(21, dirty)).toEqual({
      plType: 'administrative',
      inherited: true,
    });
  });
});
