import type { Meta, StoryObj } from '@storybook/react';
import { toast } from 'sonner';

import { Button } from './button';
import { Toaster } from './sonner';

const meta: Meta = {
  title: 'Components/Toast (Sonner)',
  tags: ['autodocs'],
};
export default meta;

export const Examples: StoryObj = {
  render: () => (
    <>
      <Toaster />
      <div className="flex gap-3">
        <Button onClick={() => toast.success('Успех!')}>Success</Button>
        <Button variant="destructive" onClick={() => toast.error('Ошибка сети')}>
          Error
        </Button>
        <Button variant="secondary" onClick={() => toast.info('Информация')}>
          Info
        </Button>
      </div>
    </>
  ),
};
