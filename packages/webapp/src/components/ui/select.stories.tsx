import type { Meta, StoryObj } from '@storybook/react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';

const meta = {
  title: 'UI/Select',
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const Field = ({ defaultOpen }: { defaultOpen?: boolean }) => (
  <div className="w-64">
    <Select defaultOpen={defaultOpen} defaultValue="50">
      <SelectTrigger>
        <SelectValue placeholder="Выберите счёт" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Счета</SelectLabel>
          <SelectItem value="50">Касса</SelectItem>
          <SelectItem value="51">Расчётный счёт</SelectItem>
          <SelectItem value="52">Валютный счёт</SelectItem>
          <SelectSeparator />
          <SelectItem value="55">Специальные счета</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
);

export const Default: Story = {
  render: () => <Field />,
};

export const Open: Story = {
  render: () => <Field defaultOpen />,
};
