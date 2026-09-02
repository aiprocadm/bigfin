import intl from 'react-intl-universal';

import {
  BIGFIN_SITE_LINK,
  BLOG_BIGFIN_LINK,
  COMMUNITY_BIGFIN_LINK,
  DOCS_BIGFIN_LINK,
  SUPPORT_BIGFIN_LINK,
} from './routes';

// Адреса берутся из единого источника (constants/routes.ts) — здесь раньше
// жил второй домен bigfin.ly с http:// и Discord предшественника.
export const getFooterLinks = () => [
  {
    title: intl.get('blog'),
    link: BLOG_BIGFIN_LINK,
  },
  {
    title: intl.get('community'),
    link: COMMUNITY_BIGFIN_LINK,
  },
  {
    title: intl.get('support'),
    link: SUPPORT_BIGFIN_LINK,
  },
  {
    title: intl.get('docs'),
    link: DOCS_BIGFIN_LINK,
  },
  {
    title: 'Bigfin',
    link: BIGFIN_SITE_LINK,
  },
];
