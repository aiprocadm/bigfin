#!/usr/bin/env bash
# Включает сжатие ответов на стенде bigfin (ops/stand/nginx/bigfin-gzip.conf).
#
# Запуск (нужны права администратора):
#   sudo bash /home/aiproc/stands/bigfin/ops/stand/enable-gzip.sh
#
# Что делает:
#   1. Кладёт файл настроек сжатия в /etc/nginx/snippets/.
#   2. В конфиг сайта ТОЧЕЧНО дописывает строку include (после certbot файл
#      целиком перезаписывать нельзя — пропадут блоки HTTPS). Повторный запуск
#      ничего не дублирует.
#   3. Проверяет конфиг `nginx -t`. Не прошёл — возвращает всё как было и
#      выходит с ошибкой; работающий сайт при этом не трогается.
#   4. Прошёл — мягко перечитывает конфиг (reload, без обрыва соединений).
#
# Откат вручную: удалить строку `include snippets/bigfin-gzip.conf;` из
# /etc/nginx/sites-available/fin.ptsfera.online.conf и `systemctl reload nginx`.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SNIPPET_SRC="$HERE/nginx/bigfin-gzip.conf"
SNIPPET_DST=/etc/nginx/snippets/bigfin-gzip.conf
SITE=/etc/nginx/sites-available/fin.ptsfera.online.conf
INCLUDE_LINE='    include snippets/bigfin-gzip.conf;'
# Якорь — строка, которая есть в блоке server сайта (и до, и после certbot).
ANCHOR='client_max_body_size 100m;'

if [ "$(id -u)" -ne 0 ]; then
  echo "Нужны права администратора: sudo bash $0" >&2
  exit 1
fi
[ -f "$SITE" ] || { echo "Нет конфига сайта: $SITE" >&2; exit 1; }
grep -q "$ANCHOR" "$SITE" || { echo "В $SITE нет строки «$ANCHOR» — вставлять некуда, ничего не меняю" >&2; exit 1; }

BACKUP="$SITE.bak-gzip-$(date +%Y%m%d%H%M%S)"
cp -p "$SITE" "$BACKUP"
HAD_SNIPPET=0
[ -f "$SNIPPET_DST" ] && { cp -p "$SNIPPET_DST" "$SNIPPET_DST.bak"; HAD_SNIPPET=1; }

rollback() {
  cp -p "$BACKUP" "$SITE"
  if [ "$HAD_SNIPPET" = 1 ]; then mv "$SNIPPET_DST.bak" "$SNIPPET_DST"; else rm -f "$SNIPPET_DST"; fi
  echo "Проверка nginx не прошла — всё возвращено как было. Сайт работает по-старому." >&2
}

mkdir -p /etc/nginx/snippets
install -m 0644 "$SNIPPET_SRC" "$SNIPPET_DST"

if ! grep -q 'include snippets/bigfin-gzip.conf;' "$SITE"; then
  # Вставляем после ПЕРВОГО вхождения якоря — это блок server с сайтом.
  # Разделитель «|», а не «/»: в самой строке include есть косая черта.
  sed -i "0,\\|$ANCHOR|s||$ANCHOR\n\n$INCLUDE_LINE|" "$SITE"
fi

if ! nginx -t; then
  rollback
  exit 1
fi
systemctl reload nginx
rm -f "$SNIPPET_DST.bak"
echo "Готово: сжатие включено. Резервная копия конфига: $BACKUP"
