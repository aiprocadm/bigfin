import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

import { TermsPage } from './TermsPage';

const meta: Meta<typeof TermsPage> = {
  title: 'Legal/TermsPage',
  component: TermsPage,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <MemoryRouter>{Story()}</MemoryRouter>],
};
export default meta;

type Story = StoryObj<typeof TermsPage>;

export const Default: Story = {};
