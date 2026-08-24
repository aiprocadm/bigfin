#!/usr/bin/env bash
# Автообновление тестового стенда до свежей ветки develop (docs/RUNBOOK_TEST_STAND.md).
#
# ВЕТКА ПО УМОЛЧАНИЮ — develop, а не main: в этом репозитории основная ветка
# именно develop, ветки main вообще нет.
#
# У стенда своя копия репозитория, свой экземпляр MySQL, свой Redis и свой
# префикс баз организаций — с разработкой он не пересекается ничем.
#
# Стенд работает из ОТДЕЛЬНОЙ копии, а не из рабочей папки разработки: иначе
# соседняя сессия своей обычной работой (сборка, смена ветки, установка
# зависимостей) оставляет стенд без рабочих артефактов. На этом сервере такое
# уже приводило к простою в несколько суток, причём внешне выглядело сетевой
# проблемой.
#
# Главный принцип: стенд НИКОГДА не остаётся без рабочих артефактов. Перед
# пересборкой снимаются копии ОБЕИХ папок сборки — витрины и сервера — и при
# любой осечке всё откатывается на предыдущее рабочее состояние, а служба
# не трогается.
#
# Копия сервера принципиальна: `nest build` СТИРАЕТ packages/server/dist
# в начале работы. Если сборка упадёт, служба останется без dist/main.js
# и уйдёт в бесконечный цикл падений — «сайт просто лежит», причём причину
# ищут где угодно, только не в сборке.
#
# Миграции: системные применяются автоматически. Базы организаций мигрируются
# приложением при обращении, отдельного шага здесь нет.
#
# Зависимости: git, pnpm (через corepack), flock, systemd.
#
# ВАЖНО про версию pnpm. Проект держит `overrides` в pnpm-workspace.yaml —
# это поведение pnpm 10; девятый их там не видит и падает на установке с
# ERR_PNPM_LOCKFILE_CONFIG_MISMATCH («overrides не совпадают с файлом
# блокировки»). На сервере в PATH стоит pnpm 9, поэтому установку зовём
# строго десятым. Проверено 24.08.2026: стенд простоял день на старой
# версии именно из-за этого — обновление падало и откатывалось каждые
# десять минут.
# sudo НЕ нужен: служба объявлена с User=aiproc, поэтому перезапуск делается
# сигналом своему же процессу, а Restart=always поднимет её обратно.
#
# Env:
#   STAND_DIR       — папка отдельной копии (default /home/aiproc/stands/bigfin)
#   STAND_BRANCH    — какую ветку показывать (default develop)
#   STAND_UNIT      — служба сервера (default fin-backend)
#   STAND_LOG       — журнал обновлений (default <STAND_DIR>/../logs/fin-update.log)
#   STAND_NODE_BIN  — папка с node/pnpm (default /home/aiproc/.nvm/versions/node/v24.18.0/bin)
#   STAND_HEALTH_URL     — что дёрнуть после перезапуска, чтобы убедиться, что служба жива
#   STAND_HEALTH_TIMEOUT — сколько ждать ответа, секунд (default 90)
#
# Установка в cron (пользователь, от которого работают службы; НЕ root):
#   */10 * * * * /home/aiproc/stands/bigfin/ops/stand/update-stand.sh
#
# Нового коммита нет — скрипт молча выходит. Ручной запуск безопасен.

# ВАЖНО: здесь намеренно НЕ `set -e`. Скрипт обязан сам перехватывать ошибки
# каждого шага и делать откат, а не умирать на первой из них.
set -uo pipefail

STAND_DIR="${STAND_DIR:-/home/aiproc/stands/bigfin}"
STAND_BRANCH="${STAND_BRANCH:-develop}"
STAND_UNIT="${STAND_UNIT:-fin-backend}"
STAND_LOG="${STAND_LOG:-$(dirname "$STAND_DIR")/logs/fin-update.log}"
STAND_NODE_BIN="${STAND_NODE_BIN:-/home/aiproc/.nvm/versions/node/v24.18.0/bin}"
STAND_HEALTH_URL="${STAND_HEALTH_URL:-http://127.0.0.1:3020/api/auth/signin}"
STAND_HEALTH_TIMEOUT="${STAND_HEALTH_TIMEOUT:-90}"

# Скрипт лежит ВНУТРИ той самой копии, которую сам же перезаписывает через
# `git reset --hard`. Bash дочитывает файл по ходу выполнения, поэтому подмена
# файла на середине приводит к непредсказуемому поведению. Поэтому первым делом
# переезжаем на временную копию себя и работаем уже с неё.
if [[ "${STAND_SELF_EXEC:-}" != "1" ]]; then
    self_copy="$(mktemp)" || exit 1
    cp "$0" "$self_copy" || { rm -f "$self_copy"; exit 1; }
    chmod +x "$self_copy"
    STAND_SELF_EXEC=1 exec "$self_copy" "$@"
fi
# Удаляем временную копию сразу: файл уже открыт, и Linux даст дочитать его
# до конца по существующему дескриптору, а мусор после себя мы не оставим.
rm -f "$0"

export PATH="$STAND_NODE_BIN:$PATH"
mkdir -p "$(dirname "$STAND_LOG")"

log() { echo "$(date '+%F %T') $*" >>"$STAND_LOG"; }

# Сборка монорепо длится дольше, чем промежуток между запусками по расписанию.
exec 9>"${STAND_DIR}.update.lock"
if ! flock -n 9; then
    log "предыдущее обновление ещё идёт — пропускаю этот запуск"
    exit 0
fi

cd "$STAND_DIR" || { log "ОШИБКА: нет папки $STAND_DIR"; exit 1; }

if ! git fetch --depth=1 origin "$STAND_BRANCH" --quiet 2>>"$STAND_LOG"; then
    log "ОШИБКА: не удалось получить обновления с GitHub"
    exit 1
fi

prev="$(git rev-parse HEAD)"
target="$(git rev-parse "origin/$STAND_BRANCH")"

if [[ "$prev" == "$target" ]]; then
    exit 0   # нового кода нет — обычный случай, молчим
fi

log "новый код ${prev:0:8} -> ${target:0:8}, начинаю обновление"

# Снимок рабочей витрины — страховка на случай неудачи.
rm -rf packages/webapp/dist.bak packages/server/dist.bak
[[ -d packages/webapp/dist ]] && cp -a packages/webapp/dist packages/webapp/dist.bak
[[ -d packages/server/dist ]] && cp -a packages/server/dist packages/server/dist.bak

rollback() {
    log "ОТКАТ: возвращаю предыдущую рабочую версию ${prev:0:8}"
    git reset --hard "$prev" --quiet 2>>"$STAND_LOG"
    if [[ -d packages/webapp/dist.bak ]]; then
        rm -rf packages/webapp/dist
        mv packages/webapp/dist.bak packages/webapp/dist
    fi
    if [[ -d packages/server/dist.bak ]]; then
        rm -rf packages/server/dist
        mv packages/server/dist.bak packages/server/dist
    fi
    log "откат завершён, стенд продолжает работать на старой версии"
}

# Команда pnpm нужной версии: если в PATH уже десятый — берём его, иначе
# поднимаем через npx (кеш npx делает это быстрым).
if [[ "$(pnpm --version 2>/dev/null | cut -d. -f1)" == "10" ]]; then
    PNPM_CMD=(pnpm)
else
    PNPM_CMD=(npx --yes pnpm@10)
fi

lock_before="$(md5sum pnpm-lock.yaml 2>/dev/null | cut -d' ' -f1)"

if ! git reset --hard "$target" --quiet 2>>"$STAND_LOG"; then
    log "ОШИБКА: не удалось переключить код"
    rollback
    exit 1
fi

lock_after="$(md5sum pnpm-lock.yaml 2>/dev/null | cut -d' ' -f1)"

# Зависимости переустанавливаем только если список реально изменился.
if [[ "$lock_before" != "$lock_after" ]]; then
    log "изменился pnpm-lock.yaml — переустанавливаю зависимости"
    if ! "${PNPM_CMD[@]}" install --frozen-lockfile >>"$STAND_LOG" 2>&1; then
        log "ОШИБКА: не встали зависимости"
        rollback
        exit 1
    fi
fi

if ! "${PNPM_CMD[@]}" build >>"$STAND_LOG" 2>&1; then
    log "ОШИБКА: не собралось"
    rollback
    exit 1
fi

# Сборка обязана оставить после себя запускаемый файл сервера. «Собралось, но
# результата нет» — не теоретический случай: без dist/main.js служба падает,
# systemd поднимает её снова, и так по кругу.
if [[ ! -f packages/server/dist/main.js ]]; then
    log "ОШИБКА: сборка прошла, но packages/server/dist/main.js не появился"
    rollback
    exit 1
fi

# Системные миграции — после успешной сборки. База у стенда своя,
# разработку это не заденет.
if ! (cd packages/server && node dist/cli.js system:migrate:latest) >>"$STAND_LOG" 2>&1; then
    log "ПРЕДУПРЕЖДЕНИЕ: системные миграции не применились, продолжаю"
fi

rm -rf packages/webapp/dist.bak packages/server/dist.bak

main_pid="$(systemctl show -p MainPID --value "$STAND_UNIT" 2>/dev/null)"
if [[ -n "$main_pid" && "$main_pid" != "0" ]]; then
    kill "$main_pid" 2>>"$STAND_LOG"
else
    # Безобидно: служба сейчас в паузе перезапуска и стартует уже с новым кодом.
    log "ПРЕДУПРЕЖДЕНИЕ: не нашёл процесс службы $STAND_UNIT, перезапуск пропущен"
fi

# Ждём, пока служба реально начнёт отвечать. Без этой проверки неудачный старт
# обнаруживается только тогда, когда на него пожалуется живой человек.
if [[ -n "$main_pid" && "$main_pid" != "0" ]]; then
    deadline=$((SECONDS + STAND_HEALTH_TIMEOUT))
    healthy=0
    while (( SECONDS < deadline )); do
        if curl -s -o /dev/null --max-time 5 "$STAND_HEALTH_URL" 2>/dev/null; then
            healthy=1
            break
        fi
        sleep 3
    done
    if [[ "$healthy" -eq 1 ]]; then
        log "стенд отвечает после перезапуска"
    else
        log "ВНИМАНИЕ: за ${STAND_HEALTH_TIMEOUT} с стенд так и не ответил — смотреть journalctl -u $STAND_UNIT"
    fi
fi

log "готово: стенд обновлён до ${target:0:8} — $(git log -1 --format='%s' | head -c 80)"
