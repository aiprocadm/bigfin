import type { Preview } from '@storybook/react';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'bigfin-dark',
      values: [
        { name: 'bigfin-dark', value: '#0A0E1A' },
        { name: 'bigfin-light', value: '#FAFAF7' },
      ],
    },
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="bigfin-ui" style={{ padding: '2rem', minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
