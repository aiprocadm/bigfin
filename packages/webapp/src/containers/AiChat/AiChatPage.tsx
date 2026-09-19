// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';

import { useAiChatTools, useAskAiChat, type ChatReply } from '@/hooks/query/ai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/Spinner';

interface Turn {
  question: string;
  reply: ChatReply | null;
}

/**
 * Экран «Спросить о своих финансах» (этап 14 ТЗ, остаток Ч1).
 *
 * Сервер умел отвечать с самого этапа 14, но спросить было негде.
 *
 * Модель НЕ имеет доступа к базе: она может только позвать готовый отчёт из
 * закрытого перечня. Каждое число ответа сверяется с тем, что вернул отчёт;
 * не сошлось — ответ не показывается вовсе. Поэтому у каждого ответа есть
 * ссылки: без них число невозможно проверить.
 */
export default function AiChatPage() {
  const { data: tools } = useAiChatTools();
  const { mutateAsync: ask, isLoading } = useAskAiChat();

  const [question, setQuestion] = React.useState('');
  const [turns, setTurns] = React.useState<Turn[]>([]);

  const onAsk = async () => {
    const text = question.trim();
    if (!text) return;

    setQuestion('');
    setTurns((prev) => [...prev, { question: text, reply: null }]);

    const response: any = await ask({ question: text });
    const reply: ChatReply =
      response?.data?.data ?? response?.data ?? response;

    setTurns((prev) =>
      prev.map((turn, index) =>
        index === prev.length - 1 ? { ...turn, reply } : turn,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{intl.get('ai_chat.page.title')}</h1>

      <p className="text-sm text-text-muted">{intl.get('ai_chat.hint')}</p>

      {/* О чём можно спросить — список приходит с сервера, а не выдумывается
          витриной: спросить о том, чего модель не умеет, значит получить
          отказ и решить, что продукт бесполезен. */}
      {(tools?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          {tools?.map((tool: any) => {
            const example = String(tool?.example ?? tool?.key ?? tool);

            return (
              <button
                key={example}
                type="button"
                className="rounded-control border border-border px-2 py-1 text-xs text-text-secondary"
                onClick={() => setQuestion(example)}
              >
                {example}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {turns.map((turn, index) => (
          <div key={index} className="flex flex-col gap-2">
            <p className="text-sm font-medium">{turn.question}</p>

            {turn.reply === null ? (
              <Spinner size="sm" />
            ) : (
              <div className="rounded-default border border-border bg-surface p-3 text-sm">
                <p className="whitespace-pre-line">{turn.reply.text}</p>

                {turn.reply.links?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {turn.reply.links.map((link) => (
                      <Link
                        key={link}
                        to={link}
                        className="text-sm text-accent underline-offset-4 hover:underline"
                      >
                        {intl.get('ai_chat.open_report')}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Input
          className="flex-1"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onAsk();
          }}
          placeholder={intl.get('ai_chat.placeholder')}
          aria-label={intl.get('ai_chat.page.title')}
        />
        <Button type="button" onClick={onAsk} disabled={isLoading || !question.trim()}>
          {intl.get('ai_chat.ask')}
        </Button>
      </div>
    </div>
  );
}
