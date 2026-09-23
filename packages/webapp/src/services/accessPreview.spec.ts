import { afterEach, describe, expect, it } from 'vitest';
import {
  accessPreviewHeaderValue,
  clearAccessPreview,
  isAccessPreviewReadOnly,
  isAccessPreviewRejected,
  readAccessPreview,
  writeAccessPreview,
} from './accessPreview';
import { accessPreviewOfMeta } from '@/components/Dashboard/AccessPreviewBanner';

/** FT-081 ТЗ-3: режим «посмотреть глазами сотрудника» в витрине. */
describe('режим проверки доступа в браузере', () => {
  afterEach(() => clearAccessPreview());

  it('заголовок идёт только в ту организацию, где режим начали', () => {
    writeAccessPreview({ userId: 7, name: 'Анна', organizationId: 'org-1' });
    expect(accessPreviewHeaderValue('org-1')).toBe('7');
    expect(accessPreviewHeaderValue('org-2')).toBeNull();
    expect(accessPreviewHeaderValue(null)).toBeNull();
  });

  it('без режима заголовка нет; мусор в хранилище режимом не считается', () => {
    expect(accessPreviewHeaderValue('org-1')).toBeNull();
    window.localStorage.setItem('bigfin.accessPreview', '{не json');
    expect(readAccessPreview()).toBeNull();
  });

  it('ответы сервера: «режим не принят» и «менять нельзя» различаются', () => {
    const rejected = { errors: [{ type: 'ACCESS_PREVIEW_OWNER_ONLY' }] };
    const readOnly = { errors: [{ type: 'ACCESS_PREVIEW_READ_ONLY' }] };
    expect(isAccessPreviewRejected(rejected)).toBe(true);
    expect(isAccessPreviewRejected(readOnly)).toBe(false);
    expect(isAccessPreviewReadOnly(readOnly)).toBe(true);
    expect(isAccessPreviewReadOnly({})).toBe(false);
  });

  it('баннер берёт режим из ответа загрузки в любом написании', () => {
    expect(accessPreviewOfMeta({ access_preview: { name: 'Анна' } })).toEqual({ name: 'Анна' });
    expect(accessPreviewOfMeta({ accessPreview: { name: 'Анна' } })).toEqual({ name: 'Анна' });
    expect(accessPreviewOfMeta({})).toBeNull();
  });
});
