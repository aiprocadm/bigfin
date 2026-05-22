# BigFin — Setup Guide

Это руководство по локальной разработке BigFin для команды.

## Требования

- **Node.js 18.x** (точно: 18.16.1, см. `.claude/CLAUDE.md`)
- **pnpm** ([установка](https://pnpm.io/installation))
- **Docker** + **Docker Compose** (для PostgreSQL/Redis)

## Установка

1. Склонировать репозиторий и зайти в директорию:

```bash
git clone https://github.com/aiprocadm/bigfin.git
cd bigfin
```

2. Создать `.env` из шаблона:

```bash
cp .env.example .env
```

3. Установить зависимости монорепо:

```bash
pnpm install
```

4. Запустить инфраструктуру (PostgreSQL, Redis):

```bash
docker compose up -d
```

5. Собрать server-пакет и применить миграции:

```bash
pnpm run build:server
pnpm run system:migrate:latest
```

6. Запустить server:

```bash
pnpm run server:start
```

## Разработка фронтенда

```bash
pnpm run dev:webapp
```

Webapp будет доступен на http://localhost:4000.

## Полезные команды

- `pnpm run typecheck` — проверка типов во всём монорепо
- `pnpm run build` — сборка всех пакетов
- `pnpm run format` — Prettier на всём коде
- `pnpm run test:e2e` — e2e-тесты

## Структура монорепо

- `packages/server/` — NestJS backend (`@bigfin/server`)
- `packages/webapp/` — React frontend (`@bigfin/webapp`)
- `shared/utils/` — общие утилиты (`@bigfin/utils`)
- `shared/email-components/` — React Email шаблоны (`@bigfin/email-components`)
- `shared/pdf-templates/` — PDF шаблоны (`@bigfin/pdf-templates`)
- `shared/sdk-ts/` — авто-генерируемые типы из OpenAPI (`@bigfin/sdk-ts`)
