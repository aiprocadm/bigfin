import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="accounts" className="w-96">
      <TabsList>
        <TabsTrigger value="accounts">Счета</TabsTrigger>
        <TabsTrigger value="contacts">Контрагенты</TabsTrigger>
        <TabsTrigger value="reports">Отчёты</TabsTrigger>
      </TabsList>
      <TabsContent value="accounts" className="mt-4">
        Список счетов вашей организации.
      </TabsContent>
      <TabsContent value="contacts" className="mt-4">
        Контрагенты — клиенты и поставщики.
      </TabsContent>
      <TabsContent value="reports" className="mt-4">
        Финансовые отчёты.
      </TabsContent>
    </Tabs>
  ),
};
