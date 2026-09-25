// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AskPanel } from './AiCfo/AskPanel';
import { MemoPanel } from './AiCfo/MemoPanel';
import { PageTitle } from '@/components/ui/page-title';

/**
 * AI CFO (FT-100…FT-102 ТЗ-3) — на месте прежнего экрана «Спросить о своих
 * финансах» (этап 14 ТЗ-1): тот же адрес и тот же пункт меню, чтобы
 * человеку не искать новый раздел.
 *
 * Прежний чат отвечал текстом со ссылкой на отчёт. AI CFO отвечает иначе:
 * вывод → числа из отчётов → причины → «Показать операции» → предложенные
 * действия, которые выполняет только сам человек. Прежняя ручка сервера
 * `ai-chat/ask` не удалена — экран просто перешёл на новую.
 *
 * Две вкладки, а не два адреса: вопрос и записка — один раздел об одних и
 * тех же числах, и держать для записки отдельный пункт меню незачем.
 */
export default function AiChatPage() {
  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <PageTitle>{intl.get('ai_cfo.page.title')}</PageTitle>
        <p className="text-sm text-text-muted">{intl.get('ai_cfo.hint')}</p>
      </div>

      <Tabs defaultValue="ask" className="flex min-w-0 flex-col gap-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="ask">{intl.get('ai_cfo.tab.ask')}</TabsTrigger>
          <TabsTrigger value="memo">{intl.get('ai_cfo.tab.memo')}</TabsTrigger>
        </TabsList>

        <TabsContent value="ask">
          <AskPanel />
        </TabsContent>
        <TabsContent value="memo">
          <MemoPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
