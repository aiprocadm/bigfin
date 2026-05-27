import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

import { PrivacyPage } from './PrivacyPage';

const meta: Meta<typeof PrivacyPage> = {
  title: 'Legal/PrivacyPage',
  component: PrivacyPage,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <MemoryRouter>{Story()}</MemoryRouter>],
};
export default meta;

type Story = StoryObj<typeof PrivacyPage>;

export const Default: Story = {};
