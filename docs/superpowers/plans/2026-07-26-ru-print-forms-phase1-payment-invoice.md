# Печатные формы РФ — фаза 1: «Счёт на оплату» — план — 2026-07-26

> Дизайн: `../specs/2026-07-26-ru-print-forms-design.md`. Один PR.
>
> **Статус: фаза 1 выполнена — PR #140 влит 2026-07-26.**
> Фаза 2 («Акт выполненных работ» + реквизиты контрагентов kpp/ogrn/bank_*
> в модель Contact и Create/Edit DTO customers/vendors, КПП покупателя в
> строках сторон) — следующий PR, эндпоинт `GET /ru-print-forms/sale-invoices/:id/act`.

## Задачи

1. **shared/pdf-templates**
   - [ ] `renderSSR` — опциональные `lang`/`title` (дефолты `en`/`Invoice` — поведение
         старых шаблонов не меняется).
   - [ ] `components/RuPaymentInvoicePaperTemplate.tsx` — форма счёта (см. дизайн §«Вид»).
   - [ ] `renders/render-ru-payment-invoice.tsx` + экспорт в `src/index.ts`.
2. **server: утилиты**
   - [ ] `RuPrintForms/utils/amountToWordsRu.ts` — сумма прописью (руб/коп, рода,
         склонения, до миллиардов) + `formatMoneyRu`, `pluralizeRu`.
   - [ ] Спека `amountToWordsRu.spec.ts` (граничные: 0, 1, 2, 5, 11–14, 21, 100, 1000,
         1001, 2000, 5000, 1e6, 1e9, копейки, отрицательные → ошибка, округление копеек).
3. **server: модуль RuPrintForms**
   - [ ] `queries/GetRuPaymentInvoicePdf.service.ts` — грузит инвойс (`GetSaleInvoice`),
         метаданные тенанта (`TenancyContext`), собирает props, рендерит HTML,
         конвертит через `ChromiumlyTenancy`.
   - [ ] `RuPrintForms.controller.ts` — `GET /ru-print-forms/sale-invoices/:id/payment-invoice`,
         флаг-гейт + `RequirePermission(SaleInvoiceAction.View)`.
   - [ ] `RuPrintForms.module.ts`, регистрация в `App.module.ts`.
   - [ ] Спека сервиса (маппинг invoice+metadata → props: НДС/без НДС, пустые реквизиты).
4. **feature-флаг**
   - [ ] `Features.RU_PRINT_FORMS = 'ru_print_forms'` (`common/types/Features.ts`),
         запись в `FeaturesConfigure` (default false), `MODULE_ALLOWLIST`,
         `FeaturesConfigure.ru_print_forms.spec.ts`.
5. **webapp (минимум фазы 1)**
   - [ ] `constants/features.tsx` — `RU_PRINT_FORMS`.
   - [ ] Кнопка «Счёт (РФ)» в `InvoiceDetailActionsBar` за `FeatureCan` →
         `useRequestPdf('ru-print-forms/sale-invoices/:id/payment-invoice')`, открытие PDF.
   - [ ] Ключи `en`/`ru` + `lang-check.js`.
6. **Проверка**
   - [ ] `pnpm --filter @bigfin/server test -- RuPrintForms Features` — зелёные.
   - [ ] `pnpm typecheck` (3 пакета) — зелёный.
   - [ ] `node packages/webapp/scripts/lang-check.js` — parity ok.

## Отложено (следующие фазы / отдельные задачи)

- Контрагенты: поднять `kpp/ogrn/bank_*` из колонок `contacts` в модель+DTO (фаза 2,
  блокирует УПД/Счёт-фактуру).
- UI ввода реквизитов организации в Настройки → Общие.
- Акт (фаза 2) → УПД (фаза 3) → ТОРГ-12 + Счёт-фактура (фаза 4), альбомный
  `PageProperties` для ТОРГ-12/УПД.
- UI выбора формы при печати (когда форм ≥2).
- Живой визуальный прогон кириллицы через Gotenberg (тех-долг ещё со stage4 русификации).
