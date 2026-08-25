#!/usr/bin/env bash
#
# Дымовая проверка стенда: сервер не просто поднялся, а ОТДАЁТ ДАННЫЕ.
#
# Зачем отдельно от health-check. 25 августа правка i18n сломала привязку
# моделей к базе организации: сервер поднимался, `/api/auth/meta` отвечал
# 200 — и при этом каждый запрос с данными падал с 500. Ни типы, ни две
# тысячи тестов, ни «сервер поднялся» этого не увидели. Один запрос к
# `/accounts` поймал бы за секунды.
#
# Использование:
#   SMOKE_EMAIL=... SMOKE_PASSWORD=... ops/stand/smoke-check.sh
#
# Переменные (все необязательные, кроме учётки):
#   SMOKE_API       — адрес API (default http://127.0.0.1:3020/api)
#   SMOKE_EMAIL     — почта пользователя стенда
#   SMOKE_PASSWORD  — пароль
#
# Код возврата: 0 — все ручки ответили 200; 1 — хоть одна нет.
set -u

API="${SMOKE_API:-http://127.0.0.1:3020/api}"
EMAIL="${SMOKE_EMAIL:-}"
PASSWORD="${SMOKE_PASSWORD:-}"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "нужны SMOKE_EMAIL и SMOKE_PASSWORD" >&2
  exit 2
fi

login="$(curl -s -m 20 -X POST "$API/auth/signin" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"

TOKEN="$(printf '%s' "$login" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"
ORG="$(printf '%s' "$login" | sed -n 's/.*"organization_id":"\([^"]*\)".*/\1/p')"

if [ -z "$TOKEN" ]; then
  echo "ОШИБКА: не удалось войти — $(printf '%s' "$login" | head -c 200)" >&2
  exit 1
fi

# Ручки нарочно разные: простой список, тяжёлый отчёт и сводка на главной.
# Первая же ловит сломанную привязку к базе организации.
failed=0
for path in "accounts" "reports/balance-sheet" "dashboard/money-summary"; do
  code="$(curl -s -o /dev/null -m 120 -w '%{http_code}' "$API/$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "organization-id: $ORG")"

  if [ "$code" = "200" ]; then
    echo "  ✔ /$path — $code"
  else
    echo "  ✘ /$path — $code"
    failed=1
  fi
done

[ "$failed" = "0" ] && echo "стенд отдаёт данные" || echo "стенд поднят, но данные не отдаёт"
exit "$failed"
