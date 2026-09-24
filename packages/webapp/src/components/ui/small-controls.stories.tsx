import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Accordion } from './accordion';
import { InsetGroup, InsetRow } from './inset-group';
import { Input } from './input';
import { RadioGroup } from './radio-group';
import { ToggleGroup } from './toggle-group';

/**
 * Мелкие элементы: радиокнопки, сворачиваемые разделы, группа переключателей,
 * группа полей формы «вставкой».
 */
const meta = {
  title: 'UI/Мелкие элементы',
  component: InsetGroup,
} satisfies Meta<typeof InsetGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const Live = () => {
  const [basis, setBasis] = React.useState('cash');
  const [toggles, setToggles] = React.useState<string[]>(['percent']);
  return (
    <div className="bigfin-ui flex max-w-xl flex-col gap-6 p-4">
      <RadioGroup
        aria-label="Как считать прибыль"
        value={basis}
        onChange={setBasis}
        options={[
          { value: 'cash', label: 'По деньгам', description: 'когда деньги пришли и ушли' },
          { value: 'accrual', label: 'По начислению', description: 'когда продали и купили' },
        ]}
      />
      <ToggleGroup
        aria-label="Вид отчёта"
        value={toggles}
        onChange={setToggles}
        options={[
          { value: 'percent', label: 'Доля от итога' },
          { value: 'empty', label: 'Пустые строки' },
          { value: 'transfers', label: 'Переводы' },
        ]}
      />
      <InsetGroup title="Организация" footer="Печатается в счёте-фактуре и УПД">
        <InsetRow label="Название" htmlFor="name">
          <Input id="name" defaultValue="Демо-организация" />
        </InsetRow>
        <InsetRow label="ИНН" htmlFor="inn" hint="10 цифр у организации, 12 — у ИП">
          <Input id="inn" />
        </InsetRow>
      </InsetGroup>
      <Accordion
        items={[
          { id: 'bank', title: 'Банковские реквизиты', content: 'БИК, расчётный счёт…' },
          { id: 'tax', title: 'Налоговый режим', content: 'УСН, ОСНО…' },
        ]}
      />
    </div>
  );
};

export const All: Story = {
  args: { children: null },
  render: () => <Live />,
};
