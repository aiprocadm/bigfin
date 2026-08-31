// © 2026 Bigfin

/**
 * Карта v45. Действующий код файла — без комментариев.
 *
 * Сторожа проекта читают исходники и ищут в них строку. Для такой проверки
 * закомментированная строка неотличима от настоящей, и сторож зеленеет на
 * сломанном продукте. Опыт по семи сторожам: закомментируешь нужную строку
 * — шесть этого не заметят.
 *
 * Болезнь ловилась уже трижды поодиночке — в картах v39, v40 и v42. Здесь
 * общее лекарство: сторож сравнивает не текст файла, а его действующий код.
 *
 * Разбор нарочно простой — он служит проверкам, а не собирает программу.
 * Главное, чего он избегает: не обрезать «//» внутри строкового значения,
 * иначе адрес в коде потерялся бы и сторож начал бы краснеть на исправном
 * продукте.
 */
export function activeCode(source: string): string {
  let result = '';
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    // Строковое значение проходит насквозь: внутри него комментариев нет.
    if (char === "'" || char === '"' || char === '`') {
      const end = findStringEnd(source, index);
      result += source.slice(index, end + 1);
      index = end + 1;
      continue;
    }
    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index++;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    result += char;
    index++;
  }

  return result;
}

/** Конец строкового значения с учётом экранирования. */
function findStringEnd(source: string, start: number): number {
  const quote = source[start];

  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === '\\') {
      i++;
      continue;
    }
    if (source[i] === quote) return i;
  }

  return source.length - 1;
}
