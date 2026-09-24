// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateField } from '@/components/ui/date-field';
import { Spinner } from '@/components/ui/Spinner';
import {
  useAiCfoIntents,
  useAskAiCfo,
  type AiCfoIntent,
  type AiCfoReply,
} from '@/hooks/query/aiCfo';
import { isAiCfoNoAccessResponse } from '@/hooks/aiCfoNoAccessResponse';
import { showApiError } from '@/utils/showApiError';
import { AnswerCard, ExampleChips } from './AnswerCard';

interface Turn {
  question: string;
  reply: AiCfoReply | null;
  /** Ответа не будет — что сказать вместо него. */
  failure?: string;
}

/**
 * «Спросить AI CFO» (FT-102 ТЗ-3): поле вопроса, примеры и период.
 *
 * Примеры приходят с сервера — это ровно те восемь видов вопросов, которые
 * AI CFO понимает. Вопрос «мимо» получает вежливый отказ с этими же
 * примерами, а не выдуманный ответ.
 *
 * Период необязателен: без него сервер берёт текущий месяц по сегодня.
 */
export function AskPanel() {
  const { data: intents } = useAiCfoIntents();
  const { mutateAsync: ask, isLoading } = useAskAiCfo();

  const [question, setQuestion] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [turns, setTurns] = React.useState<Turn[]>([]);

  const examples = ((intents ?? []) as AiCfoIntent[])
    .map((intent) => intent.example)
    .filter(Boolean);
  const periodSet = Boolean(fromDate && toDate);
  const periodInvalid = periodSet && fromDate > toDate;

  const updateLast = (patch: Partial<Turn>) =>
    setTurns((prev) =>
      prev.map((turn, index) => (index === prev.length - 1 ? { ...turn, ...patch } : turn)),
    );

  const onAsk = async (text = question.trim()) => {
    if (text.length < 2 || isLoading || periodInvalid) return;

    setQuestion('');
    setTurns((prev) => [...prev, { question: text, reply: null }]);

    try {
      const reply = await ask({
        question: text,
        ...(periodSet ? { period: { fromDate, toDate } } : {}),
      });
      updateLast({ reply });
    } catch (error: any) {
      // Отказ «нет доступа к отчёту» уже показан строкой перехватчиком
      // запросов; здесь — след в самой ленте, чтобы вопрос не висел без
      // ответа. Остальные сбои объясняет общий разбор ошибок.
      if (isAiCfoNoAccessResponse(error?.response?.data)) {
        updateLast({ failure: intl.get('ai_cfo.no_access') });
      } else {
        showApiError(error);
        updateLast({ failure: intl.get('ai_cfo.ask_failed') });
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {examples.length > 0 && (
        <ExampleChips examples={examples} onPick={(example) => setQuestion(example)} />
      )}

      <div className="flex flex-col gap-4">
        {turns.map((turn, index) => (
          <div key={index} className="flex flex-col gap-2">
            <p className="text-sm font-medium text-text-primary">{turn.question}</p>

            {turn.failure ? (
              <p className="text-sm text-text-muted">{turn.failure}</p>
            ) : turn.reply === null ? (
              <Spinner size="sm" />
            ) : (
              <AnswerCard
                reply={turn.reply}
                examples={examples}
                onPickExample={(example) => onAsk(example)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            className="min-w-0 flex-1 basis-60"
            value={question}
            maxLength={500}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onAsk();
            }}
            placeholder={intl.get('ai_cfo.placeholder')}
            aria-label={intl.get('ai_cfo.question')}
          />
          <Button
            type="button"
            onClick={() => onAsk()}
            disabled={isLoading || question.trim().length < 2 || periodInvalid}
          >
            {intl.get('ai_chat.ask')}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          <span>{intl.get('ai_cfo.period')}</span>
          <DateField
            className="w-40"
            value={fromDate}
            onChange={setFromDate}
            placeholder={intl.get('ai_cfo.period_from')}
          />
          <DateField
            className="w-40"
            value={toDate}
            onChange={setToDate}
            placeholder={intl.get('ai_cfo.period_to')}
          />
          {(fromDate || toDate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
            >
              {intl.get('ai_cfo.period_reset')}
            </Button>
          )}
          <span className="text-xs text-text-muted">
            {periodInvalid
              ? intl.get('ai_cfo.period_invalid')
              : periodSet
                ? null
                : intl.get('ai_cfo.period_default')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AskPanel;
