import React from 'react';
import intl from 'react-intl-universal';

import CashTimelineSection from './CashTimelineSection';
import FirstStepsSection from './FirstStepsSection';
import OverviewSection from './OverviewSection';
import { AiInsightsBlock } from '@/components/ui/ai-insights';
import MoneySummarySection from './MoneySummarySection';
import AccountsReceivableSection from './AccountsReceivableSection';
import AccountsPayableSection from './AccountsPayableSection';
import FinancialAccountingSection from './FinancialAccountingSection';
import ProductsServicesSection from './ProductsServicesSection';
import PlanProgressSection from './PlanProgressSection';
import ShareTargetsSection from './ShareTargetsSection';
import HomepageCustomize from './HomepageCustomize';
import { useOverviewParams } from './useOverviewParams';
import { useHomepageWidgets } from './useHomepageWidgets';
import { HomepageWidgetId, visibleWidgets } from './homepageWidgets';
import { CompareControl, PERIOD_KINDS } from './OverviewSection';
import { COMPARE_KINDS, type CompareKind } from './dashboardCompare';
import { PageTitle } from '@/components/ui/page-title';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

/**
 * Содержимое главной.
 *
 * Порядок отвечает на то, зачем человек сюда зашёл.
 *
 * 1. ЛЕНТА ДЕНЕГ — герой. Не «сколько у меня сейчас» (это одно число), а
 *    «доживу ли я до конца месяца».
 * 2. Показатели за период, график и «требует внимания» — разбор того же
 *    вопроса вглубь.
 * 3. Сводка по деньгам: остатки, долги, ближайшие платежи, налог.
 * 4. Подсказки по настройке — ниже: они нужны в первую неделю жизни
 *    организации, а место занимали всегда и у всех.
 * 5. Быстрые переходы — в самом конце, ОДНИМ блоком в колонках.
 *
 * Раньше пункт 5 был пятью отдельными блоками с сетками карточек-ссылок.
 * Вместе они занимали больше места, чем все настоящие цифры страницы, и
 * дублировали боковое меню. Все ссылки целы — они собраны в один блок.
 *
 * Между блоками нет карточек с тенями: страница держится на волосяных линиях
 * и воздухе. Одинаковые карточки уравнивали блоки по важности, и глазу было
 * не за что зацепиться.
 *
 * ПОРЯДОК ВЫШЕ — ПО УМОЛЧАНИЮ. Человек может переставить блоки и спрятать
 * лишние («Настроить главную», FT-064 ТЗ-3): у каждого своя главная. План и
 * доли в выручке (FT-060…FT-065) по умолчанию стоят сразу за показателями —
 * это тот же разбор периода, только против плана.
 */
function HomepageContent() {
  // Один выбор периода и базы на всю главную: показатели, план и доли
  // читают один и тот же ответ сервера.
  const params = useOverviewParams();
  const widgets = useHomepageWidgets();

  const blocks: Record<HomepageWidgetId, React.ReactNode> = {
    cash_timeline: <CashTimelineSection />,
    // «Что говорят цифры» (этап 13 ТЗ). По умолчанию стоит СРАЗУ ПОД лентой
    // денег: человек только что увидел, сколько у него денег, — и тут же
    // читает, что с этим не так. Блока нет вовсе, когда раздел выключен.
    ai_insights: <AiInsightsBlock scope="dashboard" />,
    overview: <OverviewSection params={params} />,
    plan: <PlanProgressSection params={params} />,
    shares: <ShareTargetsSection params={params} />,
    money_summary: <MoneySummarySection />,
    first_steps: <FirstStepsSection />,
    quick_links: (
      <section className="border-t border-border pt-6">
        <h2 className="text-[0.8125rem] font-medium text-text-muted">
          {intl.get('homepage.quick_links')}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          <AccountsReceivableSection />
          <AccountsPayableSection />
          <FinancialAccountingSection />
          <ProductsServicesSection />
        </div>
      </section>
    ),
  };

  const shown = visibleWidgets(widgets.order, widgets.hidden);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6">
      {/* Заголовок главной (UI-047-1 ТЗ-4): период — сегментами справа, база
          сравнения — в «⋯», там же «Настроить главную». Раньше выбор периода
          стоял посреди страницы, у нижнего края первого экрана (O8). */}
      <div className="-mb-4 flex flex-wrap items-center justify-between gap-3">
        <PageTitle>{intl.get('sidebar.homepage')}</PageTitle>
        <div className="flex items-center gap-2">
          <SegmentedControl
            size="sm"
            aria-label={intl.get('dashboard.period.aria')}
            value={params.period.kind === 'custom' ? 'month' : params.period.kind}
            onChange={(kind) => params.choosePeriod(kind)}
            options={PERIOD_KINDS.map((kind) => ({
              value: kind,
              label: intl.get(`dashboard.period.${kind}`),
            }))}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={intl.get('homepage.more')}>
                <MoreHorizontal className="h-5 w-5" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>{intl.get('dashboard.compare.label')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={params.compare.kind}
                onValueChange={(kind) =>
                  params.chooseCompare(
                    kind === 'custom'
                      ? { kind: 'custom', fromDate: params.compare.fromDate, toDate: params.compare.toDate }
                      : { kind: kind as CompareKind },
                  )
                }
              >
                {COMPARE_KINDS.map((kind) => (
                  <DropdownMenuRadioItem key={kind} value={kind}>
                    {intl.get(`dashboard.compare.kind_${kind}`)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <HomepageCustomize
            order={widgets.order}
            hidden={widgets.hidden}
            onOrderChange={widgets.setOrder}
            onHiddenChange={widgets.setHidden}
            onReset={widgets.reset}
          />
        </div>
      </div>

      {/* Свой период сравнения — поля дат прямо под заголовком, пока он
          выбран: в меню их не впишешь. */}
      {params.compare.kind === 'custom' && (
        <CompareControl compare={params.compare} onChange={params.chooseCompare} />
      )}

      {shown.map((id) => (
        <React.Fragment key={id}>{blocks[id]}</React.Fragment>
      ))}

      {/* Всё спрятано — пустая страница выглядела бы поломкой. */}
      {shown.length === 0 && (
        <p className="text-sm text-text-secondary">
          {intl.get('homepage.widgets.all_hidden')}
        </p>
      )}
    </div>
  );
}

export default HomepageContent;
