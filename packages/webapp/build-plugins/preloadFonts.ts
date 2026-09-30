import type { Plugin } from 'vite';

/**
 * Предзагрузка шрифта (UI-055-4 ТЗ-4).
 *
 * Inter Variable подключён пакетом `@fontsource-variable/inter` с
 * `font-display: swap`: текст рисуется сразу системным шрифтом, потом
 * подменяется. Но браузер узнаёт о файле шрифта, только разобрав CSS, — это
 * поздно, и подмена заметна как «прыжок» текста. Ссылка `preload` в `<head>`
 * просит файл сразу, вместе со скриптами.
 *
 * Предзагружаются только два файла: латиница и кириллица, прямое начертание.
 * Остальные (греческий, вьетнамский, курсив) нужны редко и грузятся по
 * требованию — предзагрузка всего набора отняла бы канал у скриптов.
 *
 * Имена файлов после сборки с хешем, поэтому берём их из самой сборки, а не
 * пишем в index.html руками. В режиме разработки сборки нет — и ссылок нет.
 */
export const PRELOADED_FONT = /inter-(latin|cyrillic)-wght-normal[^/]*\.woff2$/;

export function preloadFontFiles(fileNames: string[]): string[] {
  return fileNames.filter((name) => PRELOADED_FONT.test(name)).sort();
}

export function preloadFonts(): Plugin {
  return {
    name: 'bigfin-preload-fonts',
    apply: 'build',
    transformIndexHtml(_html, ctx) {
      const files = preloadFontFiles(Object.keys(ctx.bundle ?? {}));
      return files.map((file) => ({
        tag: 'link',
        attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
        injectTo: 'head-prepend' as const,
      }));
    },
  };
}
