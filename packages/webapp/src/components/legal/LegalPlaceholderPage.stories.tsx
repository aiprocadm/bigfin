import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

import { LegalPlaceholderPage } from './LegalPlaceholderPage';

const meta: Meta<typeof LegalPlaceholderPage> = {
  title: 'Legal/LegalPlaceholderPage',
  component: LegalPlaceholderPage,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <MemoryRouter>{Story()}</MemoryRouter>],
};
export default meta;

type Story = StoryObj<typeof LegalPlaceholderPage>;

export const Privacy: Story = {
  args: {
    title: 'Политика конфиденциальности',
    description:
      'Документ в подготовке. Скоро здесь появится полный текст политики обработки персональных данных.',
  },
};

export const Terms: Story = {
  args: {
    title: 'Условия использования',
    description:
      'Документ в подготовке. Скоро здесь появится полный текст условий использования сервиса Bigfin.',
  },
};

export const LongDescription: Story = {
  args: {
    title: 'Очень длинный заголовок страницы для проверки переноса',
    description:
      'Эта story проверяет, что вёрстка не ломается на длинном тексте описания. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum. Cras venenatis euismod malesuada. Nullam ac erat ante. Fusce ornare mauris vel ipsum convallis, eu sodales mi pulvinar.',
  },
};
