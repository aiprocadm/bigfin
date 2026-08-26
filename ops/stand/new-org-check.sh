#!/usr/bin/env bash
#
# Приёмка рождения организации: регистрирует пользователя, создаёт
# организацию и проверяет, что она собралась и получила стартовые данные.
#
# Зачем отдельно от smoke-check. 25 августа сид уведомлений перестал
# вставляться (MySQL игнорирует `defaultTo` у колонок TEXT), и сборка
# организации падала целиком — с того дня ни одна новая организация не
# создавалась. Ни тесты, ни «сервер поднялся», ни smoke-check этого не
# видели: сервер был здоров, а существующая организация давно собрана.
# Ломается только РОЖДЕНИЕ новой.
#
# Скрипт оставляет на стенде тестового пользователя и организацию — это
# нормально для тестового стенда, но на боевом его запускать не следует.
#
# Использование:
#   ops/stand/new-org-check.sh                 # адрес сгенерируется сам
#   NEW_ORG_SUFFIX=проба2 ops/stand/new-org-check.sh
#
# Переменные:
#   SMOKE_API         — адрес API (default http://127.0.0.1:3020/api)
#   NEW_ORG_SUFFIX    — суффикс адреса почты (default — метка времени)
#   NEW_ORG_PASSWORD  — пароль тестового пользователя (default Password123!)
#
# Код возврата: 0 — организация собралась и получила стартовые данные.
set -u

API="${SMOKE_API:-http://127.0.0.1:3020/api}"
SUFFIX="${NEW_ORG_SUFFIX:-$(date +%H%M%S)}"
EMAIL="new-org-check-$SUFFIX@bigfin.local"
PASSWORD="${NEW_ORG_PASSWORD:-Password123!}"

json_field() { # $1 — файл, $2 — ключ
  sed -n "s/.*\"$2\":\"\([^\"]*\)\".*/\1/p" "$1" | head -1
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "регистрирую $EMAIL"
curl -s -m 30 -X POST "$API/auth/signup" -H 'Content-Type: application/json' \
  -d "{\"first_name\":\"Проверка\",\"last_name\":\"Стенда\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -o "$tmp/signup.json"

curl -s -m 20 -X POST "$API/auth/signin" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" -o "$tmp/signin.json"

TOKEN="$(json_field "$tmp/signin.json" access_token)"
ORG="$(json_field "$tmp/signin.json" organization_id)"

if [ -z "$TOKEN" ]; then
  echo "ОШИБКА: не удалось войти — $(head -c 200 "$tmp/signup.json")" >&2
  exit 1
fi

echo "создаю организацию"
curl -s -m 60 -X POST "$API/organization/build" \
  -H "Authorization: Bearer $TOKEN" -H "organization-id: $ORG" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Проверка стенда","location":"RU","base_currency":"RUB","timezone":"Europe/Moscow","fiscal_year":"january","language":"ru","interface_mode":"business","tax_regime":"USN_INCOME"}' \
  -o "$tmp/build.json"

# Сборка базы занимает пару минут. Стенд при этом может уйти на
# перезапуск по расписанию — тогда лучше повторить запуск скрипта.
ready=нет
for _ in $(seq 1 30); do
  curl -s -m 20 "$API/organization/current" \
    -H "Authorization: Bearer $TOKEN" -H "organization-id: $ORG" -o "$tmp/org.json"
  if grep -q '"is_ready":true' "$tmp/org.json"; then
    ready=да
    break
  fi
  sleep 10
done

if [ "$ready" != "да" ]; then
  echo "  ✘ организация не собралась — смотреть journalctl -u fin-backend | grep 'build job'" >&2
  exit 1
fi
echo "  ✔ организация собралась"

failed=0

accounts="$(curl -s -m 30 "$API/accounts" \
  -H "Authorization: Bearer $TOKEN" -H "organization-id: $ORG")"
count="$(printf '%s' "$accounts" | grep -o '"name"' | wc -l)"
if [ "$count" -gt 10 ]; then
  echo "  ✔ план счетов создан ($count счетов)"
else
  echo "  ✘ план счетов пуст или неполон ($count)"
  failed=1
fi

prefs="$(curl -s -m 30 "$API/notifications/preferences" \
  -H "Authorization: Bearer $TOKEN" -H "organization-id: $ORG")"
rules="$(printf '%s' "$prefs" | grep -o '"event_type"' | wc -l)"
if [ "$rules" -ge 3 ]; then
  echo "  ✔ правила уведомлений заведены ($rules)"
else
  echo "  ✘ правил уведомлений нет ($rules) — как раз то, что ломало сборку"
  failed=1
fi

if grep -q '"tax_regime":"USN_INCOME"' "$tmp/org.json"; then
  echo "  ✔ налоговый режим сохранён"
else
  echo "  ✘ налоговый режим не сохранился"
  failed=1
fi

[ "$failed" = "0" ] && echo "рождение организации работает" || echo "рождение организации сломано"
exit "$failed"
