import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

const meta: Meta = {
  title: 'Components/Card',
  tags: ['autodocs'],
};
export default meta;

export const Default: StoryObj = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Войдите в Bigfin</CardTitle>
        <CardDescription>Управляйте финансами бизнеса</CardDescription>
      </CardHeader>
      <CardContent>Контент карточки</CardContent>
      <CardFooter>
        <Button>Действие</Button>
      </CardFooter>
    </Card>
  ),
};
