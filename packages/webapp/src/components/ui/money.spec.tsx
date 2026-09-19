import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Money, moneyToneBySign } from './money';

/**
 * Правила денег в интерфейсе.
 *
 * Главное, что здесь стережётся: расход не красится красным. Это решение, а
 * не недосмотр, и без сторожа оно проживёт до первой «очевидной» правки.
 */
describe('Money', () => {
  it('сумма набирается моноширинными цифрами и жмётся вправо', () => {
    // Иначе столбцы сумм не выстраиваются по разрядам и их нельзя сравнить
    // взглядом — приходится читать каждую.
    render(<Money>1 240 500 ₽</Money>);

    expect(screen.getByText('1 240 500 ₽')).toHaveClass('money');
  });

  it('РАСХОД НЕ КРАСНЫЙ', () => {
    // Расходы в управленческом учёте — норма работы, а не авария. Красный
    // на каждом расходе превращает здоровый бизнес в стену тревоги, и
    // настоящая беда теряется среди неё.
    render(<Money>−45 000 ₽</Money>);

    expect(screen.getByText('−45 000 ₽')).not.toHaveClass('text-danger');
  });

  it('красный — только у проблемы', () => {
    render(<Money tone="problem">−45 000 ₽</Money>);

    expect(screen.getByText('−45 000 ₽')).toHaveClass('text-danger');
  });

  it('приход зелёный', () => {
    render(<Money tone="positive">+120 000 ₽</Money>);

    expect(screen.getByText('+120 000 ₽')).toHaveClass('text-success');
  });

  it('сумма-герой набирается крупно', () => {
    render(<Money hero>1 240 500 ₽</Money>);

    expect(screen.getByText('1 240 500 ₽')).toHaveClass('money-hero');
  });
});

describe('moneyToneBySign', () => {
  it('положительная сумма — приход', () => {
    expect(moneyToneBySign(120000)).toBe('positive');
  });

  it('ОТРИЦАТЕЛЬНАЯ сумма — обычные чернила, а НЕ проблема', () => {
    // Отрицательный знак сам по себе ничего плохого не означает: расход,
    // возврат и корректировка отрицательны по своей природе. Проблемой сумму
    // делает смысл, а не знак.
    expect(moneyToneBySign(-45000)).toBe('default');
  });

  it('по знаку проблема не назначается никогда', () => {
    [-1, -1000000, -0.01].forEach((amount) => {
      expect(moneyToneBySign(amount)).not.toBe('problem');
    });
  });

  it('нет суммы — приглушённая', () => {
    // Ноль и пустота — разные вещи: «ноль» это факт, «нет данных» — нет.
    expect(moneyToneBySign(null)).toBe('muted');
    expect(moneyToneBySign(undefined)).toBe('muted');
    expect(moneyToneBySign(NaN)).toBe('muted');
  });

  it('ноль — обычные чернила', () => {
    expect(moneyToneBySign(0)).toBe('default');
  });
});
