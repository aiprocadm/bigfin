import type { Meta, StoryObj } from '@storybook/react';

import { AuthLayout } from './AuthLayout';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

const meta: Meta = {
  title: 'Layouts/AuthLayout',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const Default: StoryObj = {
  render: () => (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Войдите в Bigfin</h1>
          <p className="mt-1 text-text-secondary">Управляйте финансами бизнеса</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="name@company.ru" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
          <Button>Войти</Button>
        </div>
      </div>
    </AuthLayout>
  ),
};
