// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import {
  useCostAllocationRules,
  useDeleteRule,
} from '@/hooks/query/costAllocation';
import { CostAllocationRuleDialog } from './CostAllocationRuleDialog';

interface RuleRow {
  id: number;
  name: string;
  allocationKey: string;
  isActive: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}

export default function CostAllocationPage() {
  const { featureCan } = useFeatureCan();
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<RuleRow | null>(null);

  const { data: rules } = useCostAllocationRules({}, {});
  const deleteMutation = useDeleteRule({});

  if (!featureCan('cost_allocation')) return null;

  const rows: RuleRow[] = rules ?? [];

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(intl.get('cost_allocation.deleted_ok'));
    } catch {
      toast.error(intl.get('cost_allocation.delete_error'));
    }
  };

  if (showCreate) {
    return (
      <div className="p-6">
        <CostAllocationRuleDialog
          onDone={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      </div>
    );
  }

  if (editingRule) {
    return (
      <div className="p-6">
        <CostAllocationRuleDialog
          initialValues={editingRule}
          onDone={() => setEditingRule(null)}
          onCancel={() => setEditingRule(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('cost_allocation.page.title')}
        </h1>
        <Button onClick={() => setShowCreate(true)}>
          {intl.get('cost_allocation.action.create')}
        </Button>
      </div>

      <div className="flex flex-col divide-y rounded-md border">
        {rows.length === 0 && (
          <div className="text-muted-foreground p-4 text-sm">
            {intl.get('cost_allocation.empty')}
          </div>
        )}
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div className="flex flex-col">
              <span className="font-medium">{r.name}</span>
              <span className="text-muted-foreground">
                {intl.get(`cost_allocation.key.${r.allocationKey}`)}
                {r.validFrom ? ` · ${r.validFrom}` : ''}
                {r.validTo ? ` — ${r.validTo}` : ''}
                {!r.isActive ? ` · ${intl.get('cost_allocation.inactive')}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingRule(r)}
              >
                {intl.get('cost_allocation.action.edit')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(r.id)}
              >
                {intl.get('cost_allocation.action.delete')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
