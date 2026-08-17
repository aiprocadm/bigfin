import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Сторож С1 (карта v14): диалоги массового удаления обязаны ГОВОРИТЬ причину
 * ошибки. Раньше все 13 глушили её тостом «что-то пошло не так» (а счета —
 * крашем разборщика), хотя сервер присылает осмысленный код.
 */
const dialogsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const bulkDeleteDialogs = fs
  .readdirSync(dialogsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((dir) =>
    fs
      .readdirSync(path.join(dialogsDir, dir.name))
      .filter((f) => f.endsWith('BulkDeleteDialog.tsx'))
      .map((f) => path.join(dir.name, f)),
  );

describe('диалоги массового удаления говорят причину ошибки', () => {
  it('находит все диалоги-близнецы (не меньше 13)', () => {
    expect(bulkDeleteDialogs.length).toBeGreaterThanOrEqual(13);
  });

  it.each(bulkDeleteDialogs)('%s разбирает ошибку через showApiError', (rel) => {
    const src = fs.readFileSync(path.join(dialogsDir, rel), 'utf-8');
    expect(src, `${rel}: catch обязан звать showApiError`).toMatch(
      /\.catch\(showApiError\)/,
    );
    expect(
      src,
      `${rel}: слепой тост «что-то пошло не так» запрещён — разбор в showApiError`,
    ).not.toMatch(/something_went_wrong/);
  });
});
