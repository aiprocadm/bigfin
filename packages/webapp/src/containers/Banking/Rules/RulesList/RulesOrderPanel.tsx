// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { Button, Classes, Intent, Tag } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { useReorderBankRules } from '@/hooks/query/bank-rules';
import { showApiError } from '@/utils/showApiError';
import { moveItem, orderChanged, sortRulesByOrder } from './rulesOrder';

interface OrderRule {
  id: number;
  name: string;
  order?: number | null;
  paused_at?: string | null;
}

/**
 * Порядок автоправил (FT-035 ТЗ-3): верхнее срабатывает первым.
 *
 * Мышью — перетаскиванием, пальцем и с клавиатуры — стрелками «выше» и
 * «ниже»: на телефоне перетаскивание браузера не работает, а основатель
 * пользуется продуктом с телефона.
 */
export function RulesOrderPanel({ rules, onDone }: { rules: OrderRule[]; onDone: () => void }) {
  const initial = React.useMemo(() => sortRulesByOrder(rules), [rules]);
  const [list, setList] = React.useState<OrderRule[]>(initial);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const { mutateAsync: reorder, isLoading } = useReorderBankRules();

  const move = (from: number, to: number) => setList((prev) => moveItem(prev, from, to));

  const handleSave = async () => {
    const ids = list.map((rule) => rule.id);
    if (!orderChanged(initial.map((rule) => rule.id), ids)) {
      onDone();
      return;
    }
    try {
      await reorder(ids);
      AppToaster.show({ intent: Intent.SUCCESS, message: intl.get('banking.rules.order.saved') });
      onDone();
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 640 }}>
      <p className={Classes.TEXT_MUTED} style={{ fontSize: 12 }}>
        {intl.get('banking.rules.order.hint')}
      </p>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {list.map((rule, index) => (
          <li
            key={rule.id}
            draggable
            onDragStart={() => setDragging(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragging !== null) move(dragging, index);
              setDragging(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              marginBottom: 4,
              border: '1px solid var(--color-border, #e0e0e0)',
              borderRadius: 6,
              cursor: 'grab',
              opacity: dragging === index ? 0.5 : 1,
            }}
          >
            <span aria-hidden style={{ color: 'var(--color-text-secondary, #888)' }}>⋮⋮</span>
            <span style={{ width: 24, textAlign: 'right' }}>{index + 1}.</span>
            <span style={{ flex: 1 }}>{rule.name}</span>
            {rule.paused_at && <Tag minimal>{intl.get('banking.rules.paused')}</Tag>}
            <Button
              minimal
              small
              icon="arrow-up"
              disabled={index === 0}
              aria-label={intl.get('banking.rules.order.up')}
              title={intl.get('banking.rules.order.up')}
              onClick={() => move(index, index - 1)}
            />
            <Button
              minimal
              small
              icon="arrow-down"
              disabled={index === list.length - 1}
              aria-label={intl.get('banking.rules.order.down')}
              title={intl.get('banking.rules.order.down')}
              onClick={() => move(index, index + 1)}
            />
          </li>
        ))}
      </ol>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button onClick={onDone}>{intl.get('cancel')}</Button>
        <Button intent={Intent.PRIMARY} loading={isLoading} onClick={handleSave}>
          {intl.get('banking.rules.order.save')}
        </Button>
      </div>
    </div>
  );
}
