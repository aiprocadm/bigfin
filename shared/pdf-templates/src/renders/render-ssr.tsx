import { renderToString } from 'react-dom/server';
import createCache from '@emotion/cache';
import { extractCritical } from '@emotion/server';
import { OpenSansFontLink } from '../constants';
import { PaperTemplateLayout } from '../components/PaperTemplateLayout';

interface RenderSSROptions {
  lang?: string;
  title?: string;
}

export const renderSSR = (
  children: React.ReactNode,
  { lang = 'en', title = 'Invoice' }: RenderSSROptions = {}
) => {
  const key = 'invoice-paper-template';
  const cache = createCache({ key });

  const renderedHtml = renderToString(
    <PaperTemplateLayout cache={cache}>{children}</PaperTemplateLayout>
  );
  const extractedHtml = extractCritical(renderedHtml);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>${title}</title>
    ${OpenSansFontLink}
    <style data-emotion="${key} ${extractedHtml.ids.join(' ')}">${extractedHtml.css
    }</style>
</head>
<body>
    <div id="root">${extractedHtml.html}</div>
</body>
</html>`;
};
