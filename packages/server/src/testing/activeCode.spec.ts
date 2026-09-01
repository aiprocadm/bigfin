// © 2026 Bigfin

import { activeCode } from './activeCode';

/**
 * Карта v45. Сторожа не отличают код от текста о коде.
 *
 * Сторожа проекта читают исходники и ищут в них строку. Закомментированная
 * строка для них выглядит как настоящая — значит проверка зеленеет на
 * сломанном продукте.
 *
 * Опыт по семи сторожам: закомментируешь нужную строку — **шесть** этого
 * не замечают.
 *
 * Эта же болезнь ловилась уже трижды поодиночке: в картах v39 (проверка
 * находила поля поиска внутри комментариев), v40 (находила имя в старом
 * стороже) и v42 (запрет срабатывал на упоминании в тексте). Общего
 * лекарства не было.
 */
describe('действующий код', () => {
  it('выбрасывает закомментированную строку', () => {
    const code = ['const a = 1;', '// const b = 2;'].join('\n');

    expect(activeCode(code)).toContain('const a');
    expect(activeCode(code)).not.toContain('const b');
  });

  it('выбрасывает хвостовой комментарий, оставляя сам код', () => {
    const code = 'const a = 1; // здесь про useAccountantOnlyExplained';

    expect(activeCode(code)).toContain('const a = 1;');
    expect(activeCode(code)).not.toContain('useAccountantOnlyExplained');
  });

  it('выбрасывает блочный комментарий', () => {
    const code = ['/**', ' * про searchSlot', ' */', 'const a = 1;'].join('\n');

    expect(activeCode(code)).not.toContain('searchSlot');
    expect(activeCode(code)).toContain('const a');
  });

  it('выбрасывает комментарий внутри разметки', () => {
    const code = '<div>{/* тут был searchSlot */}<Slot /></div>';

    expect(activeCode(code)).not.toContain('searchSlot');
    expect(activeCode(code)).toContain('<Slot />');
  });

  it('не трогает две косые внутри строки', () => {
    // Иначе адрес в коде обрежется по «//», и проверка потеряет настоящий
    // код — сторож начнёт краснеть на исправном продукте.
    const code = "const url = 'https://fin.example/api';";

    expect(activeCode(code)).toContain('https://fin.example/api');
  });

  it('не трогает две косые в шаблонной строке', () => {
    const code = 'const url = `https://${host}/api`;';

    expect(activeCode(code)).toContain('https://${host}/api');
  });
});
