// © 2026 Bigfin
import {
  requestsForbiddenLegalEntity,
  visibleLegalEntityIds,
} from './visibleLegalEntities';

/**
 * Этап 8 ТЗ, §8.4. Кому какие юрлица видно.
 *
 * Ошибка здесь — это показанные чужие деньги. Поэтому правило проверяется
 * само по себе, а не только через отчёты, где его легко потерять из виду.
 */

describe('visibleLegalEntityIds', () => {
  it('без ограничения запрос проходит как есть', () => {
    // Владелец и администратор видят всё.
    expect(visibleLegalEntityIds([1, 2], {})).toEqual([1, 2]);
    expect(visibleLegalEntityIds([], undefined)).toEqual([]);
  });

  it('«все юрлица» для ограниченного — это все ЕГО юрлица', () => {
    // Иначе бухгалтер ИП, открыв отчёт без отбора, увидел бы ООО.
    expect(
      visibleLegalEntityIds([], { allowedLegalEntityIds: [2] }),
    ).toEqual([2]);
    expect(
      visibleLegalEntityIds(undefined, { allowedLegalEntityIds: [2, 3] }),
    ).toEqual([2, 3]);
  });

  it('запрос чужого юрлица не расширяет доступ', () => {
    expect(
      visibleLegalEntityIds([1, 2], { allowedLegalEntityIds: [2] }),
    ).toEqual([2]);
  });

  it('запрос только чужого даёт пустой список, а не чужие данные', () => {
    expect(
      visibleLegalEntityIds([1], { allowedLegalEntityIds: [2] }),
    ).toEqual([]);
  });

  it('номера строками сравниваются как числа', () => {
    // Роль могла сохранить список строками.
    expect(
      visibleLegalEntityIds(['2' as any], { allowedLegalEntityIds: [2] }),
    ).toEqual([2]);
  });
});

describe('requestsForbiddenLegalEntity', () => {
  it('запрос чужого юрлица распознаётся', () => {
    // Такой запрос не должен молча превращаться в пустой отчёт: человек
    // решит, что у юрлица нет операций, и будет неправ.
    expect(
      requestsForbiddenLegalEntity([1], { allowedLegalEntityIds: [2] }),
    ).toBe(true);
  });

  it('запрос своего юрлица — не нарушение', () => {
    expect(
      requestsForbiddenLegalEntity([2], { allowedLegalEntityIds: [2] }),
    ).toBe(false);
  });

  it('без ограничения нарушений не бывает', () => {
    expect(requestsForbiddenLegalEntity([1, 2], {})).toBe(false);
  });

  it('пустой запрос — не нарушение', () => {
    // «Все юрлица» ограниченного пользователя сузятся сами.
    expect(
      requestsForbiddenLegalEntity([], { allowedLegalEntityIds: [2] }),
    ).toBe(false);
  });
});
