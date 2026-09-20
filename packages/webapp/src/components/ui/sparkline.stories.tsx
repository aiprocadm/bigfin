import type { Meta, StoryObj } from '@storybook/react';

import { formatOrganizationMoney } from '@/utils/organizationMoney';

import { Sparkline } from './sparkline';

/**
 * Тренд строки отчёта. Истории подобраны так, чтобы рядом стояли случаи,
 * которые легко перепутать: ноль и пропуск, ровный тренд и отсутствие тренда.
 */
const meta = {
  title: 'UI/Sparkline',
  component: Sparkline,
} satisfies Meta<typeof Sparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Деньги печатаются ОБЩЕЙ утилитой продукта, а не собственным форматтером.
 * Свой форматтер в истории — это образец для следующего разработчика, и
 * ровно так в продукт уже попадали четыре экрана, печатавшие «45 000» без
 * знака валюты (Р1 карты v26).
 */
const money = formatOrganizationMoney;

const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн'];

const trend = (...values: Array<number | null>) =>
  values.map((value, index) => ({ label: months[index], value }));

export const Рост: Story = {
  args: {
    points: trend(120000, 180000, 240000, 260000, 410000, 520000),
    formatValue: money,
  },
};

export const Падение: Story = {
  args: {
    points: trend(4383887, 3900000, 3100000, 2400000, 1244516, 1300000),
    formatValue: money,
  },
};

/** Ровный тренд — это ответ «ничего не менялось», а не поломка. */
export const Ровный: Story = {
  args: { points: trend(0, 0, 0, 0, 0, 0), formatValue: money },
};

/** Расход показывается отрицательными суммами и остаётся той же линией. */
export const Отрицательные: Story = {
  args: {
    points: trend(-50000, -120000, -90000, -300000, -140000, -60000),
    formatValue: money,
  },
};

/** Пропуск разрывает линию: соединить значило бы дорисовать данные. */
export const СПропуском: Story = {
  args: {
    points: trend(120000, 180000, null, null, 410000, 520000),
    formatValue: money,
  },
};

/** Одно значение тренда не получает — компонент не рисует ничего. */
export const ОдноЗначение: Story = {
  args: { points: trend(120000), formatValue: money },
};
