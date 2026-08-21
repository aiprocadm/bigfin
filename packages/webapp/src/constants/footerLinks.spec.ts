import { describe, it, expect } from 'vitest';
import { getFooterLinks } from './footerLinks';

/**
 * Р3 карты v16 (вопрос 30). В подвале мастера настройки жили ссылки на
 * второй домен bigfin.ly (в том числе `http://` без TLS) и Discord
 * зарубежного предшественника — как минимум один набор вёл в никуда.
 */
describe('внешние ссылки продукта', () => {
  const links = getFooterLinks().map((item) => item.link);

  it('все ссылки ведут на bigfin.app или почту', () => {
    for (const link of links) {
      expect(link).toMatch(/^(https:\/\/([a-z]+\.)?bigfin\.app|mailto:)/);
    }
  });

  it('чужого домена и Discord больше нет', () => {
    for (const link of links) {
      expect(link).not.toContain('bigfin.ly');
      expect(link).not.toContain('discord');
    }
  });

  it('незащищённого http:// больше нет', () => {
    for (const link of links) {
      expect(link.startsWith('http://')).toBe(false);
    }
  });
});
