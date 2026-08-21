/**
 * Внешние адреса продукта — единственный источник (Р3 карты v16, вопрос 30).
 *
 * Раньше жили два домена: в шапке — bigfin.app, в мастере настройки —
 * bigfin.ly (в том числе `http://` без TLS), а «Поддержка» и «Сообщество»
 * вели в Discord зарубежного предшественника. Как минимум один набор вёл в
 * никуда. Решение: всё на bigfin.app и только https; поддержка — почтой.
 */
export const BIGFIN_SITE_LINK = 'https://bigfin.app';
export const DOCS_BIGFIN_LINK = 'https://docs.bigfin.app';
export const BLOG_BIGFIN_LINK = 'https://docs.bigfin.app/blog';
export const COMMUNITY_BIGFIN_LINK = 'https://community.bigfin.app';
export const SUPPORT_BIGFIN_EMAIL = 'support@bigfin.app';
export const SUPPORT_BIGFIN_LINK = `mailto:${SUPPORT_BIGFIN_EMAIL}`;
