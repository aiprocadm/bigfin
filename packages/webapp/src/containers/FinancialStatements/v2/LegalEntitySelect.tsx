import * as React from 'react';
import intl from 'react-intl-universal';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = 'all';

/**
 * Отбор отчёта по юрлицу — список кита вместо серого системного `<select>`
 * браузера (O9 живого прохода, UI-049-1 ТЗ-4). Один на все отчёты с
 * разрезом по юрлицам.
 */
export function LegalEntitySelect({
  entities,
  value,
  onChange,
}: {
  entities: Array<{ id: number; name: string }>;
  value?: number;
  onChange: (id: number | undefined) => void;
}) {
  return (
    <Select
      value={value ? String(value) : ALL}
      onValueChange={(next) => onChange(next === ALL ? undefined : Number(next))}
    >
      <SelectTrigger className="h-9 w-auto min-w-44" aria-label={intl.get('cash_flow_articles.legal_entity')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{intl.get('cash_flow_articles.legal_entity.all')}</SelectItem>
        {entities.map((entity) => (
          <SelectItem key={entity.id} value={String(entity.id)}>
            {entity.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
