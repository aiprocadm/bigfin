import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * UI-042-9 ТЗ-4. НАЙДЕНО ЖИВЫМ ПРОХОДОМ: «Удалить» стояло текстом в каждой
 * строке рядом с «Изменить» и удаляло сделку с одного нажатия, без вопроса.
 * Сделка удаляется насовсем (корзины у сделок нет), поэтому удаление живёт
 * в меню «⋯» и проходит только через окно подтверждения.
 */
const code = activeCode(
  fs.readFileSync(path.join(__dirname, 'DealsPage.tsx'), 'utf8'),
);

describe('удаление сделки', () => {
  it('нажатие не удаляет сразу — только открывает подтверждение', () => {
    expect(code).not.toMatch(/onClick=\{\(\) => onDelete\(/);
    expect(code).toContain('setDeleting(d)');
  });

  it('подтверждение — красное окно с названием сделки', () => {
    expect(code).toContain('<ConfirmDialog');
    expect(code).toMatch(
      /intl\.get\('deals\.delete_confirm\.title',\s*\{\s*name:/,
    );
    expect(code).toContain('intent="danger"');
  });

  it('действия строки — в меню «⋯»', () => {
    expect(code).toContain('<DropdownMenuTrigger');
  });
});
