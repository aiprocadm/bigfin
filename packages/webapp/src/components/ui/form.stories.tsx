import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from './button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './form';
import { Input } from './input';

const schema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
});

type LoginValues = z.infer<typeof schema>;

const meta: Meta = {
  title: 'Components/Form',
  tags: ['autodocs'],
};
export default meta;

export const LoginExample: StoryObj = {
  render: () => {
    const form = useForm<LoginValues>({
      resolver: zodResolver(schema),
      defaultValues: { email: '', password: '' },
      mode: 'onBlur',
    });

    const onSubmit = (values: LoginValues) => {
      // eslint-disable-next-line no-alert
      alert(JSON.stringify(values, null, 2));
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-80 flex-col gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="name@company.ru" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Пароль</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Войти</Button>
        </form>
      </Form>
    );
  },
};
