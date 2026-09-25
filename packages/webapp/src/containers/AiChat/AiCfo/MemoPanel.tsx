// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { Intent } from '@blueprintjs/core';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  BAR_MAX_SIZE,
  BAR_RADIUS,
  ChartCard,
  ChartTooltip,
  chartAnimation,
  chartColor,
  formatAxisMoney,
  gridProps,
  xAxisProps,
  yAxisProps,
} from '@/components/ui/charts';
import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ScreenError } from '@/components/ui/screen-error';
import { isFeatureDisabledResponse } from '@/hooks/featureDisabledResponse';
import { isAiCfoNoAccessResponse } from '@/hooks/aiCfoNoAccessResponse';
import {
  useAiCfoMemo,
  useDownloadAiCfoMemoPdf,
  useRateAiCfoMemo,
  type AiCfoMemo,
  type AiCfoMemoSection,
  type AiCfoPeriod,
} from '@/hooks/query/aiCfo';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { showApiError } from '@/utils/showApiError';
import { memoPlainText } from './aiCfoHelpers';
import { formatAiCfoDate, formatAiCfoDateTime } from './aiCfoFormat';
import { BusinessContextForm } from './BusinessContextForm';

/** Текущий месяц по сегодня — так же считает сервер без периода. */
const defaultPeriod = (): AiCfoPeriod => ({
  fromDate: moment().startOf('month').format('YYYY-MM-DD'),
  toDate: moment().format('YYYY-MM-DD'),
});

/**
 * «Аналитическая записка» (FT-100 ТЗ-3): Обзор · Денежные потоки · Прибыль ·
 * Долги · Риски · Сильные стороны · Рекомендации.
 *
 * Текст и числа собирает сервер по правилам из тех же отчётов, что на
 * экранах: записку отдают бухгалтеру и в банк, выдуманной цифры в ней быть
 * не может. Витрина только показывает её, копирует текстом, отдаёт PDF и
 * спрашивает, была ли она полезна.
 */
export function MemoPanel() {
  const [period, setPeriod] = React.useState<AiCfoPeriod>(defaultPeriod);
  const periodInvalid = !period.fromDate || !period.toDate || period.fromDate > period.toDate;

  const { data: memo, isLoading, isError, error, refetch } = useAiCfoMemo(period, {
    enabled: !periodInvalid,
  });
  const pdf = useDownloadAiCfoMemoPdf();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(memoPlainText(memo));
      AppToaster.show({ message: intl.get('ai_cfo.memo.copied'), intent: Intent.SUCCESS });
    } catch {
      // Браузер не дал доступ к буферу (нет разрешения, не https) — скажем
      // прямо, а не сделаем вид, что скопировали.
      AppToaster.show({ message: intl.get('ai_cfo.memo.copy_failed'), intent: Intent.WARNING });
    }
  };

  const errorData = (error as any)?.response?.data;
  const disabled = isError && isFeatureDisabledResponse(errorData);
  // Нет права на один из отчётов записки — это не сбой, «Повторить» не
  // поможет; говорим как есть.
  const noAccess = isError && isAiCfoNoAccessResponse(errorData);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
        <span>{intl.get('ai_cfo.period')}</span>
        <DateField
          className="w-40"
          value={period.fromDate}
          onChange={(fromDate) => setPeriod((prev) => ({ ...prev, fromDate }))}
          placeholder={intl.get('ai_cfo.period_from')}
        />
        <DateField
          className="w-40"
          value={period.toDate}
          onChange={(toDate) => setPeriod((prev) => ({ ...prev, toDate }))}
          placeholder={intl.get('ai_cfo.period_to')}
        />
        {periodInvalid && (
          <span className="text-xs text-danger">{intl.get('ai_cfo.period_invalid')}</span>
        )}
      </div>

      {disabled ? (
        <p className="rounded-default border border-border bg-surface p-4 text-sm text-text-secondary">
          {intl.get('ai_cfo.unavailable')}
        </p>
      ) : noAccess ? (
        <p className="rounded-default border border-border bg-surface p-4 text-sm text-text-secondary">
          {intl.get('ai_cfo.no_access')}
        </p>
      ) : isError ? (
        <ScreenError message={intl.get('ai_cfo.memo.failed')} onRetry={() => refetch()} />
      ) : isLoading || !memo ? (
        !periodInvalid && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )
      ) : (
        <article className="flex flex-col gap-4">
          {(memo as AiCfoMemo).sections.map((section) => (
            <MemoSectionView key={section.key} section={section} />
          ))}

          {memo.calculatedAt && (
            <p className="text-xs text-text-muted">
              {intl.get('ai_cfo.memo.calculated', {
                from: formatAiCfoDate(memo.period?.fromDate ?? period.fromDate),
                to: formatAiCfoDate(memo.period?.toDate ?? period.toDate),
                at: formatAiCfoDateTime(memo.calculatedAt),
              })}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onCopy}>
              {intl.get('ai_cfo.memo.copy')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pdf.isLoading}
              onClick={() => pdf.download(memo.period ?? period)}
            >
              {intl.get('ai_cfo.memo.pdf')}
            </Button>
          </div>

          {/* Ключ по периоду: у новой записки — новая оценка. */}
          <MemoRating key={`${period.fromDate}:${period.toDate}`} period={memo.period ?? period} />
        </article>
      )}

      <BusinessContextForm />
    </div>
  );
}

function MemoSectionView({ section }: { section: AiCfoMemoSection }) {
  const chart = section.chart ?? [];

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-default border border-border bg-surface p-4 text-sm">
      <h3 className="text-base font-medium text-text-primary">{section.title}</h3>

      {section.text.map((paragraph, index) => (
        <p key={index} className="text-text-primary">
          {paragraph}
        </p>
      ))}

      {section.figures.length > 0 && (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {section.figures.map((figure) => (
            <div
              key={figure.label}
              className="flex min-w-0 flex-col gap-0.5 rounded-control border border-border bg-surface-elevated p-3"
            >
              <dt className="text-xs text-text-muted">{figure.label}</dt>
              <dd className="money break-words font-medium text-text-primary">
                {figure.value === null
                  ? intl.get('ai_cfo.figure.no_base')
                  : formatOrganizationMoney(figure.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {chart.length > 0 && (
        // График из тех же чисел, что в тексте: своего запроса у него нет,
        // иначе картинка могла бы разойтись с цифрами. Через общий набор
        // (C21, этап 46 ТЗ-4): оси «тыс./млн ₽», «Таблица».
        <ChartCard
          className="min-w-0 border-0 p-0"
          title={section.title}
          heightOverride={{ desktop: 192, phone: 192 }}
          pointCount={chart.length}
          table={{
            columns: [
              { key: 'label', label: intl.get('charts.col.period') },
              { key: 'value', label: section.title, numeric: true, render: (row: any) => formatOrganizationMoney(Number(row.value) || 0) },
            ],
            rows: chart as any[],
          }}
        >
          {({ xInterval }) => (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={xInterval} />
                <YAxis {...yAxisProps} tickFormatter={formatAxisMoney} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="value"
                  name={section.title}
                  fill={chartColor.ink}
                  radius={BAR_RADIUS}
                  maxBarSize={BAR_MAX_SIZE}
                  isAnimationActive={chartAnimation()}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      )}
    </section>
  );
}

/** «Полезно?» — оценка уходит в журнал; после отправки кнопки гаснут. */
function MemoRating({ period }: { period: AiCfoPeriod }) {
  const rate = useRateAiCfoMemo();
  const [useful, setUseful] = React.useState<boolean | null>(null);
  const [comment, setComment] = React.useState('');
  const [sent, setSent] = React.useState(false);

  const send = async (value: boolean) => {
    try {
      await rate.mutateAsync({
        useful: value,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        period,
      });
      setSent(true);
    } catch (error) {
      showApiError(error);
    }
  };

  if (sent) {
    return <p className="text-sm text-text-secondary">{intl.get('ai_cfo.memo.thanks')}</p>;
  }

  return (
    <div className="flex flex-col gap-2 rounded-default border border-border bg-surface p-4 text-sm">
      <span className="font-medium text-text-primary">{intl.get('ai_cfo.memo.useful')}</span>
      <Textarea
        value={comment}
        maxLength={1000}
        rows={2}
        onChange={(event) => setComment(event.target.value)}
        placeholder={intl.get('ai_cfo.memo.comment_placeholder')}
        aria-label={intl.get('ai_cfo.memo.comment_placeholder')}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={rate.isLoading}
          aria-pressed={useful === true}
          onClick={() => {
            setUseful(true);
            send(true);
          }}
        >
          <ThumbsUp className="h-4 w-4" aria-hidden />
          {intl.get('ai_cfo.memo.useful_yes')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={rate.isLoading}
          aria-pressed={useful === false}
          onClick={() => {
            setUseful(false);
            send(false);
          }}
        >
          <ThumbsDown className="h-4 w-4" aria-hidden />
          {intl.get('ai_cfo.memo.useful_no')}
        </Button>
      </div>
    </div>
  );
}

export default MemoPanel;
