# Русификация, этап 4 «PDF-документы» — план

**Дата:** 2026-06-13
**Ветка:** `feat/russification-stage-4` (поверх этапа 3)
**Спека:** `docs/superpowers/specs/2026-06-11-full-russification-design.md` (раздел «Этап 4»)

## Спайк по кириллице — исход

- **Движок:** Gotenberg **v7** + Chromium (HTML→PDF). Шаблоны заявляют `font-family: "Open Sans"`, которого в образе Gotenberg нет → Chromium падает на дефолтный `sans-serif` контейнера. Надёжное покрытие кириллицы Noto — с Gotenberg 8.30+; для v7 шрифтовой набор не подтверждён.
- **Локальный визуальный спайк не удалось выполнить** — Docker Desktop на машине разработки нестабилен (тормозил, контейнер Gotenberg падал на chromium-конвертации, затем Linux-движок Docker отвалился).
- **Решение основателя:** не ждать Docker — **встроить шрифт с гарантированной кириллицей** в PDF-шаблон. Финальная визуальная проверка — позже на staging/CI.

## Митигация шрифта — ГОТОВО ✅

`shared/pdf-templates/src/components/_fonts.ts` — Base64-woff2 Open Sans (сабсеты latin+cyrillic, веса 400/700, ~59 КБ raw / 79 КБ файл), сгенерировано из fontsource. Подключено в `PaperTemplateLayout.tsx` через `createGlobalStyle` (@font-face перед остальными стилями). Теперь `"Open Sans"` резолвится во встроенный шрифт с кириллицей — рендер детерминированный на любой версии Gotenberg/окружении. `pdf-templates` собирается (webpack ok, dist gitignored → собирает CI).

## Работы по переводу лейблов (мирроринг этапа 3)

PDF-лейблы берутся из `default*PdfTemplateAttributes` (английские дефолты в `*/constants.ts`), мёржатся с пер-организационными правками из таблицы `pdf_templates` (JSON `attributes`). Переводим **дефолты на языке организации** в `*PdfTemplate.service.ts` (точка заполнения) через `OrganizationI18nService` (без args, как в письмах). Новый словарь `i18n/{en,ru}/pdf.json`.

### По типам документов (5): счёт / смета / чек / кредит-нота / оплата
Для каждого: ~10–17 лейблов (`*NumberLabel`, `*DateLabel`, `billedToLabel`, `lineItem/Qty/Rate/Total`, `subtotal/discount/adjustment/total`, `dueAmount`, `termsConditions`, `customerNote`, `statement`) → ключи `pdf.<doc>.*` / общие `pdf.label.*`. Источники: `SaleInvoices/SaleEstimates/SaleReceipts/CreditNotes/PaymentReceived/constants.ts` (`default*PdfTemplateAttributes`).

### Захардкоженный JSX в шаблонах
- Заголовки `PaperTemplate.BigTitle title={'Invoice'|'Estimate'|'Receipt'|'Credit Note'|'Payment'}` — сделать пропом (напр. `documentTitleLabel`), заполнять с сервера на языке организации.
- `PaymentReceivedPaperTemplate.tsx`: 3 шапки таблицы `'Invoice #'`/`'Invoice Amount'`/`'Paid Amount'` — захардкожены → пропсы + перевод.

### Заготовки `_constants.ts`
Условия (`DefaultPdfTemplateTerms`), благодарность (`DefaultPdfTemplateStatement`), примеры позиций — это образцы-плейсхолдеры в превью; перевод через язык организации/веб-словарь по необходимости (анти-скоуп: не раздувать).

## Приёмка
- `pnpm typecheck` (3 пакета) + сборка `pdf-templates`.
- `node packages/server/scripts/i18n-parity-check.js` — парность.
- Серверные тесты pdf-переводов.
- ru-translation-reviewer по `pdf.json`.
- **ОБЯЗАТЕЛЬНО на staging/CI:** сгенерировать счёт в PDF, убедиться, что кириллица читаема (нет «квадратиков»). Без этого этап не закрывать.

## Anti-scope
- Per-org кастомные шаблоны (`pdf_templates.attributes`) — пользовательские данные, не трогаем.
- `ar/es/sv` — не трогаем.
