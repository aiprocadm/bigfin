// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useContactDebts, useRemindDebtor } from '@/hooks/query/debts';
import { RepaymentPlanDialog } from './RepaymentPlanDialog';

const fmt = (n: number) => `${(n ?? 0).toLocaleString('ru-RU')} ₽`;

interface Props {
  contact: {
    contactId: number;
    contactName: string;
    total: number;
    overdueTotal: number;
  };
  side: 'receivable' | 'payable';
}

export function DebtsContactRow({ contact, side }: Props) {
  const [open, setOpen] = React.useState(false);
  const [showPlan, setShowPlan] = React.useState(false);
  const remind = useRemindDebtor({});

  const { data: docs } = useContactDebts(
    open ? contact.contactId : 0,
    { side },
    {},
  );

  const onRemind = async (invoiceId: number) => {
    try {
      await remind.mutateAsync(invoiceId);
      toast.success(intl.get('debts.reminder_sent'));
    } catch {
      toast.error(intl.get('debts.reminder_error'));
    }
  };

  const docsList: any[] = docs ?? [];

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="hover:bg-muted/50 flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-medium">{contact.contactName}</span>
        <span className="flex items-center gap-4 text-sm">
          <span>{fmt(contact.total)}</span>
          {contact.overdueTotal > 0 && (
            <span className="text-red-600">
              {intl.get('debts.overdue')}: {fmt(contact.overdueTotal)}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="bg-muted/30 flex flex-col gap-2 px-4 py-3">
          {docsList.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between text-sm"
            >
              <span>
                {intl.get('debts.doc', { number: d.number })} · {d.dueDate}
                {d.overdueDays > 0 && (
                  <span className="text-red-600">
                    {' '}
                    · {intl.get('debts.overdue_days', { days: d.overdueDays })}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-3">
                <span>{fmt(d.dueAmount)}</span>
                {side === 'receivable' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemind(d.id)}
                  >
                    {intl.get('debts.action.remind')}
                  </Button>
                )}
              </span>
            </div>
          ))}
          <div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPlan(true)}
            >
              {intl.get('debts.action.repayment_plan')}
            </Button>
          </div>
        </div>
      )}

      {showPlan && (
        <RepaymentPlanDialog
          side={side}
          contactId={contact.contactId}
          onDone={() => setShowPlan(false)}
          onCancel={() => setShowPlan(false)}
        />
      )}
    </div>
  );
}
