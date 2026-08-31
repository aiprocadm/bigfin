// © 2026 Bigfin
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Р2 карты v40. Скрытый экран объясняет себя, а не подменяет адрес.
 *
 * Шесть чисто-бухгалтерских экранов скрыты в режиме «Бизнес». Страж
 * маршрута делал `history.replace('/')`: адрес молча менялся на главную —
 * ни заголовка, ни объяснения, ни следа. Отличить это от поломки
 * невозможно, а ссылка из отчётов и закладка выглядели битыми.
 *
 * Правило продукта уже есть: «выключенный раздел объясняет себя»
 * (карта v36). Здесь то же самое — режим человек выбрал сам.
 */
const SRC = path.resolve(__dirname, '../..');

const read = (relative: string) =>
  fs.readFileSync(path.join(SRC, relative), 'utf8');

describe('маршрут, скрытый режимом интерфейса', () => {
  const route = read('components/Dashboard/DashboardContentRoute.tsx');

  it('адрес больше не подменяется молча', () => {
    const guard = read('hooks/state/interfaceMode.tsx');

    expect(guard).not.toMatch(/history\.replace\(\s*['"]\/['"]\s*\)/);
    expect(route).not.toMatch(/history\.replace\(\s*['"]\/['"]\s*\)/);
  });

  it('вместо содержимого показывается объяснение', () => {
    // Ищем именно отрисовку экрана. Первая редакция проверки искала слово
    // «AccountantOnly» где угодно — и зеленела на неисправном маршруте,
    // потому что находила его в имени старого стража-редиректа.
    expect(route).toMatch(/<AccountantOnly\s*\/>/);
  });

  it('решение берётся из общего правила, а не переписано заново', () => {
    // Тот же вопрос уже решают меню и экран отчётов. Второй ответ на один
    // вопрос — это будущее расхождение. Маршрут спрашивает общий хук, а
    // хук — общее правило из constants/interfaceMode.
    expect(route).toContain('useAccountantOnlyExplained');

    const hook = read('hooks/state/interfaceMode.tsx');

    expect(hook).toContain('shouldExplainAccountantOnly');
  });

  it('экран объяснения существует и говорит из словаря', () => {
    const screen = read('components/ui/accountant-only.tsx');

    expect(screen).toContain('accountant_only.title');
    expect(screen).toContain('/preferences/interface-mode');
  });
});
