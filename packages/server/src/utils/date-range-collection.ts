import * as moment from 'moment';

/**
 * ПОЧЕМУ ЗДЕСЬ ЕСТЬ ЗАЩИТА ОТ ВЕЧНОГО ЦИКЛА.
 *
 * Эти два помощника шагают по датам от начала к концу периода. Шаг задаётся
 * единицей времени: день, месяц, квартал, год.
 *
 * `moment` НЕ РУГАЕТСЯ на неизвестную единицу — он молча ничего не делает.
 * `moment().add(1, 'date_periodss')` возвращает ту же дату; `startOf` и
 * `endOf` с неизвестной единицей тоже не двигают её. Условие выхода из цикла
 * при этом никогда не выполняется.
 *
 * Итог: цикл крутится вечно, складывая записи в список, пока не кончится
 * память — и падает ВЕСЬ СЕРВЕР, а не один запрос.
 *
 * Так и было: на главной странице у запроса отчёта стояло
 * `displayColumnsBy: 'date_periods'` вместо `'month'`. Главный экран продукта
 * убивал сервер сообщением «JavaScript heap out of memory», и найти это можно
 * было только замером времени ответа — ни один тест сюда не заглядывал.
 *
 * Поэтому: если за шаг дата НЕ СДВИНУЛАСЬ, это ошибка в коде, и мы говорим о
 * ней вслух сразу. Молчаливое зацикливание нельзя ни заметить, ни отладить.
 */
function assertCursorMoved(
  before: number,
  after: number,
  addType: unknown,
): void {
  if (before !== after) return;

  throw new Error(
    `dateRangeCollection: единица времени «${String(addType)}» не двигает ` +
      'дату — цикл по периодам был бы бесконечным. Ожидались day, week, ' +
      'month, quarter или year.',
  );
}

export const dateRangeCollection = (
  fromDate,
  toDate,
  addType: moment.unitOfTime.StartOf = 'day',
  increment: number = 1,
) => {
  const collection = [];
  const momentFromDate = moment(fromDate);
  let dateFormat = '';

  switch (addType) {
    case 'day':
    default:
      dateFormat = 'YYYY-MM-DD';
      break;
    case 'month':
    case 'quarter':
      dateFormat = 'YYYY-MM';
      break;
    case 'year':
      dateFormat = 'YYYY';
      break;
  }
  for (
    let i = momentFromDate;
    i.isBefore(toDate, addType) || i.isSame(toDate, addType);

  ) {
    collection.push(i.endOf(addType).format(dateFormat));

    const before = i.valueOf();

    i.add(increment, `${addType}s` as moment.unitOfTime.DurationConstructor);
    assertCursorMoved(before, i.valueOf(), addType);
  }
  return collection;
};

export const dateRangeFromToCollection = (
  fromDate: moment.MomentInput,
  toDate: moment.MomentInput,
  addType: moment.unitOfTime.StartOf = 'day',
  increment: number = 1,
) => {
  const collection = [];
  const momentFromDate = moment(fromDate);
  const dateFormat = 'YYYY-MM-DD';

  for (
    let i = momentFromDate;
    i.isBefore(toDate, addType) || i.isSame(toDate, addType);

  ) {
    collection.push({
      fromDate: i.startOf(addType).format(dateFormat),
      toDate: i.endOf(addType).format(dateFormat),
    });

    const before = i.valueOf();

    i.add(increment, `${addType}s` as moment.unitOfTime.DurationConstructor);
    assertCursorMoved(before, i.valueOf(), addType);
  }
  return collection;
};
