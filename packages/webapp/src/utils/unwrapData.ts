/**
 * Достаёт полезную часть ответа сервера.
 *
 * Одни эндпоинты отвечают обёрткой `{ data: [...] }`, другие — сразу массивом
 * или объектом. Хуки же поголовно писали `res.data.data`, и там, где обёртки
 * нет, получали `undefined` — список на экране оставался пустым, хотя данные
 * пришли. Так молча пустовали сделки, правила распределения расходов, заявки
 * на платёж, сотрудники и расчёты зарплаты.
 *
 * Здесь мы берём `data` только если она есть, иначе — сам ответ.
 */
export const unwrapData = <T = any>(response: any): T => {
  const payload = response?.data;

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return 'data' in payload ? payload.data : payload;
  }
  return payload;
};
