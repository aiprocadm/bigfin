# ③ Выбор режима интерфейса в онбординге — дизайн (дополнение)

Дата: 2026-07-31. Закрывает последний пробел ③ из аудита v5: «выбор режима
не вшит в onboarding-флоу». Базовая спека —
`2026-06-17-interface-modes-business-accountant-design.md` (реализована:
режим хранится в `tenants_metadata.interface_mode`, прячет 6 бухгалтерских
экранов, переключается в Настройках).

## Задача

Новый пользователь узнаёт о режимах только если случайно зайдёт в
Настройки. Целевая аудитория — предприниматели без бухгалтерского
образования: выбор «Бизнес/Бухгалтер» должен предлагаться при создании
организации, с «Бизнес» по умолчанию.

## Решение

**Backend (2 точки):**
- `BuildOrganizationDto` — опциональное поле `interfaceMode`
  (`@IsIn(INTERFACE_MODES)`), в точности как в `UpdateOrganizationDto`.
- Сохранение — ничего не менять: `BuildOrganization` уже кладёт весь DTO в
  `tenants_metadata` спредом (`saveMetadata`), колонка `interface_mode`
  существует. Пустое значение = `business` (нормализация при чтении уже
  реализована).
- Тест в `Organization.dto.spec.ts`: build-DTO принимает
  `business`/`accountant` и отвергает прочее.

**Frontend (форма шага «Организация» мастера):**
- В `SetupOrganizationForm` после часового пояса — выпадающий список
  «Режим интерфейса» с двумя пунктами (существующие ключи
  `interface_mode.business` / `interface_mode.accountant`) и подписью
  простыми словами (существующий `interface_mode.description`).
- `defaultValues.interfaceMode = 'business'` — целевой пользователь получает
  простой режим, ничего не выбирая.
- Схема валидации: `oneOf(['business','accountant'])`, необязательное.
- Новые i18n-ключи: только подпись поля в мастере
  (`setup.organization.interface_mode`), парно en/ru.

## Вне объёма

Отдельный шаг мастера с картинками-сравнением режимов (лишний экран для
MVP), смена режима из мастера постфактум (уже есть в Настройках).

## Проверка

- Jest: валидация build-DTO.
- Живая: `POST /organization/build` с `interface_mode: 'accountant'` →
  `GET /organization/current` возвращает `accountant`; без поля → `business`.
