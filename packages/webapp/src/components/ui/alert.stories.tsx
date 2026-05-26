import type { Meta, StoryObj } from '@storybook/react';
import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from './alert';

const meta: Meta = {
  title: 'Components/Alert',
  tags: ['autodocs'],
};
export default meta;

export const Default: StoryObj = {
  render: () => (
    <Alert className="w-96">
      <AlertTitle>Внимание</AlertTitle>
      <AlertDescription>Это информационное сообщение.</AlertDescription>
    </Alert>
  ),
};

export const Destructive: StoryObj = {
  render: () => (
    <Alert variant="destructive" className="w-96">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Ошибка входа</AlertTitle>
      <AlertDescription>Неверный email или пароль.</AlertDescription>
    </Alert>
  ),
};
