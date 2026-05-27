import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    // DS-компоненты и брендовые .mdx-страницы.
    '../src/components/ui/**/*.stories.@(ts|tsx|mdx)',
    '../src/components/ui/**/*.mdx',
    // Bold Fintech-пилоты, рендерящиеся как самостоятельные страницы.
    '../src/components/auth/**/*.stories.@(ts|tsx|mdx)',
    '../src/components/legal/**/*.stories.@(ts|tsx|mdx)',
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
};

export default config;
