// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { Eye } from 'lucide-react';

import { useDashboardMeta } from '@/hooks/query';
import { exitAccessPreview, readAccessPreview } from '@/services/accessPreview';

/**
 * Баннер режима проверки доступа (FT-081 ТЗ-3) — на каждом экране.
 *
 * Владелец смотрит глазами сотрудника, и об этом нельзя забыть: иначе он
 * решит, что у него пропали данные, или попробует что-то поменять. Имя
 * берётся из ответа сервера — баннер виден, только если сервер режим принял.
 */
export function AccessPreviewBanner() {
  const { data } = useDashboardMeta({ enabled: false }) as {
    data?: { access_preview?: { name?: string } | null };
  };
  const preview = accessPreviewOfMeta(data);
  // Режим включён в браузере, но сервер его не подтвердил (ещё грузится) —
  // баннер всё равно нужен: запросы уже идут с чужими правами.
  const local = readAccessPreview();
  if (!preview && !local) return null;
  const name = preview?.name || local?.name || '';

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-warning px-4 py-2 text-sm text-text-primary"
    >
      <Eye className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 break-words">
        {intl.get('access_preview.banner', { name })}
      </span>
      <button
        type="button"
        onClick={exitAccessPreview}
        className="shrink-0 rounded-default border border-border bg-background px-3 py-1 text-sm font-medium hover:bg-surface-elevated"
      >
        {intl.get('access_preview.exit')}
      </button>
    </div>
  );
}

export function accessPreviewOfMeta(meta: any): { name?: string } | null {
  return meta?.access_preview ?? meta?.accessPreview ?? null;
}
