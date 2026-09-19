import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    // DS-компоненты и брендовые .mdx-страницы.
    '../src/components/ui/**/*.stories.@(ts|tsx|mdx)',
    '../src/components/ui/**/*.mdx',
    // Bold Fintech-пилоты, рендерящиеся как самостоятельные страницы.
    '../src/components/auth/**/*.stories.@(ts|tsx|mdx)',
    '../src/components/legal/**/*.stories.@(ts|tsx|mdx)',
    '../src/components/Dashboard/**/*.stories.@(ts|tsx|mdx)',
    // Блоки экранов: их тоже надо уметь посмотреть без поднятого
    // сервера — это единственный способ проверить оформление глазами.
    '../src/containers/**/*.stories.@(ts|tsx|mdx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },

  /**
   * Витрина историй — инструмент разработки, ей не нужна поддержка старых
   * браузеров. А из `vite.config.mts` сюда приезжает `@vitejs/plugin-legacy` и
   * ставит целями `chrome64` и соседей. С ними сборка падала: `chai` (приходит
   * с надстройкой взаимодействий) содержит большие целые `0n`, которых в тех
   * браузерах нет (Д17 карты v84).
   */
  viteFinal: async (config) => {
    // Список надстроек бывает вложенным — сначала разворачиваем его в один
    // уровень, иначе `vite:legacy-*` остаются внутри и правят цели дальше.
    config.plugins = (config.plugins ?? [])
      .flat(Infinity)
      .filter((plugin) => {
        const name = (plugin as { name?: string } | undefined)?.name ?? '';
        return !name.startsWith('vite:legacy');
      });
    config.build = { ...config.build, target: 'es2022' };
    config.esbuild = { ...(config.esbuild || {}), target: 'es2022' };
    return config;
  },
};

export default config;
