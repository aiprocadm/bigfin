import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Состояние «ошибка» на экранах-списках (§5.3 ТЗ, остаток Д4).
 *
 * ЧТО БЫЛО. Обёртка содержимого знала только про загрузку. Если запрос списка
 * падал, страница показывала ПУСТОЙ СПИСОК — тот же экран, что и при честном
 * «записей пока нет». Человек видел «данных нет» и шёл искать несуществующую
 * проблему в своих цифрах вместо кнопки «Повторить».
 *
 * ПОЧЕМУ СТОРОЖ НУЖЕН. Это ровно тот вид поломки, который не ловит ни один
 * обычный тест: экран РАБОТАЕТ, он просто врёт. И добавить новый экран-список,
 * забыв про сбой, легче лёгкого — остальные четырнадцать про него помнят
 * молча.
 */
const ROOT = __dirname;

/** Все файлы провайдеров списков. */
function listProviders(dir: string, acc: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) return listProviders(full, acc);
    if (entry.name.endsWith('ListProvider.tsx')) acc.push(full);
  });

  return acc;
}

const providers = listProviders(ROOT).filter((file) =>
  activeCode(fs.readFileSync(file, 'utf8')).includes('<DashboardInsider'),
);

describe('сбой на экране-списке виден человеку', () => {
  it('провайдеры списков вообще нашлись', () => {
    // Без этой проверки спека молча позеленеет на пустом списке файлов.
    expect(providers.length).toBeGreaterThanOrEqual(14);
  });

  providers.forEach((file) => {
    const name = path.basename(file);
    const source = activeCode(fs.readFileSync(file, 'utf8'));

    it(`${name}: сообщает обёртке о сбое`, () => {
      expect(source).toContain('error={');
    });

    it(`${name}: даёт «Повторить»`, () => {
      // Сообщить о сбое и не дать его исправить — половина дела: человек
      // остаётся на сломанном экране и уходит перезагружать браузер.
      expect(source).toContain('onRetry={');
    });

    it(`${name}: берёт сбой у ЗАПРОСА, а не выдумывает`, () => {
      expect(source).toContain('isError:');
    });
  });

  it('обёртка показывает сбой ВМЕСТО содержимого', () => {
    const insider = activeCode(
      fs.readFileSync(
        path.join(ROOT, '../components/Dashboard/DashboardInsider.tsx'),
        'utf8',
      ),
    );

    expect(insider).toContain('ScreenError');
    // Сбой важнее загрузки: пока показывается «грузим», человек ждёт.
    expect(insider).toContain('error ?');
  });
});
