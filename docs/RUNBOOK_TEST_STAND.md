# Runbook — тестовый стенд fin.ptsfera.online

**Owner**: ops / тех.лид
**Scope**: как устроен демо-стенд, как он сам обновляется до `develop`, как поднять его с нуля и что проверять, когда «сайт не открывается».
**Контекст**: стенд нужен, чтобы смотреть результат разработки в браузере глазами пользователя и показывать его заказчику. Поэтому он не заморожен на релизе, а догоняет `develop` автоматически. Это **не production**: данные тестовые.

---

## 1. Устройство

| Часть | Где | Комментарий |
|---|---|---|
| Код стенда | `/home/aiproc/stands/bigfin` | **Отдельная копия** репозитория, свои `node_modules`, свои `.env` (chmod 600, в git НЕ хранятся) |
| Код разработки | `/home/aiproc/projects/bigfin` | Отдан сессиям разработки целиком, стенда не касается |
| Сервер | служба `fin-backend` → `127.0.0.1:3020` | NestJS, `User=aiproc`, `Restart=always` |
| Витрина | статика `packages/webapp/dist` внутри копии, отдаёт nginx | Пересобирается при каждом обновлении |
| База | **свой экземпляр MySQL**, контейнер `bigfin-mysql-stand`, порт 3307 | Системная `bigfin_stand_system`, базы организаций с префиксом `bigfin_stand_tenant_` |
| Очередь | **свой Redis**, контейнер `bigfin-redis-stand`, порт 6380 | Сборка базы новой организации идёт через неё |
| Адрес | `fin.ptsfera.online` | basic-auth, логин `demo`, файл `/etc/nginx/.htpasswd-stand` |
| Обновление | cron `*/10 * * * *` → `ops/stand/update-stand.sh` | Ветка **`develop`** — `main` в этом репозитории нет |

Образцы файлов: [`ops/stand/`](../ops/stand/) — скрипт обновления, юнит systemd, конфиг nginx.

**Один поддомен на проект:** витрина в корне, сервер под `/api` того же домена. Отдельного API-поддомена нет намеренно — иначе понадобился бы CORS. Схема заработала без правок витрины: `packages/webapp/src/services/axios.tsx` создаёт клиент **без** `baseURL`, то есть ходит по относительным путям.

### У стенда всё своё

| Ресурс | Разработка | Стенд |
|---|---|---|
| Папка кода | `~/projects/bigfin` | `~/stands/bigfin` |
| MySQL | общий контейнер, порт 3306 | **свой контейнер, порт 3307** |
| Системная база | `bigfin_system` | **`bigfin_stand_system`** |
| Базы организаций | `bigfin_tenant_*` | **`bigfin_stand_tenant_*`** |
| Redis (очередь) | общий, порт 6379 | **свой контейнер, порт 6380** |
| Секреты подписи токенов | свои | **свои, другие** |
| Порт сервера | 3000/3010 | **3020** |

**На `/api` пароль nginx снят — иначе стендом невозможно пользоваться.** У витрины ДВА http-клиента: `services/axios.tsx` кладёт токен в собственный заголовок `x-access-token`, а `hooks/useRequest.tsx` — в стандартный `Authorization: Bearer`. Второй вытесняет пропуск basic-auth из браузера (карман один), nginx отвечает 401 с `WWW-Authenticate`, и окно пароля выскакивает снова и снова.

Сервер при этом защищён своей авторизацией: без токена `/api` отдаёт 401 **без** `WWW-Authenticate` — окна пароля от него не будет.

---

## 2. Как обновляется

`ops/stand/update-stand.sh` (cron, каждые 10 минут, от пользователя `aiproc`, **без sudo**):

1. `git fetch` → нет нового коммита в `origin/develop` → **молча выходит**.
2. Есть новый → снимки **обеих** папок сборки: `packages/webapp/dist` и `packages/server/dist`.
3. `git reset --hard` → зависимости **только если** сменился `pnpm-lock.yaml` → `pnpm build` → проверка, что появился `packages/server/dist/main.js` → системные миграции.
4. Успех → `kill` главного процесса службы; systemd поднимет её с новым кодом, дальше скрипт ждёт ответа стенда (до 90 с) и пишет результат в журнал.
5. **Любая осечка → откат**: код и ОБЕ папки сборки возвращаются на предыдущее рабочее состояние, служба не трогается, причина пишется в журнал.

**Почему снимок сервера принципиален:** `nest build` стирает `packages/server/dist` в начале работы. Если сборка упадёт, служба останется без `dist/main.js` и уйдёт в бесконечный цикл падений — со стороны это «сайт просто лежит», и причину ищут где угодно, только не в сборке.

Базы организаций мигрируются приложением при обращении — отдельного шага нет.

**Скрипт переезжает на временную копию себя** перед `git reset --hard`: он лежит внутри той же копии, которую перезаписывает, а bash дочитывает файл по ходу выполнения.

### Команды на каждый день

```bash
tail -20 /home/aiproc/stands/logs/fin-update.log     # что и когда обновлялось
/home/aiproc/stands/bigfin/ops/stand/update-stand.sh # обновить сейчас, не ждать
```

Ручной запуск безопасен: если нового кода нет, скрипт ничего не делает.

---

## 3. Развернуть с нуля

```bash
# 1. Свои MySQL и Redis — стенд ничего не делит с разработкой.
#    Образ строго mysql:8.0: в 8.4 убран mysql_native_password, а драйвер
#    mysql@2.18.1 умеет только его.
docker run -d --name bigfin-mysql-stand --restart unless-stopped \
  -p 127.0.0.1:3307:3306 -e MYSQL_ROOT_PASSWORD='<свой>' \
  -e MYSQL_DATABASE=bigfin_stand_system \
  mysql:8.0 --default-authentication-plugin=mysql_native_password
docker run -d --name bigfin-redis-stand --restart unless-stopped \
  -p 127.0.0.1:6380:6379 redis:7-alpine

# Пользователю нужны ГЛОБАЛЬНЫЕ права: приложение само создаёт базу
# под каждую новую организацию.
docker exec bigfin-mysql-stand mysql -uroot -p'<свой>' -e "
  CREATE USER 'bigfin'@'%' IDENTIFIED WITH mysql_native_password BY '<свой>';
  GRANT ALL PRIVILEGES ON *.* TO 'bigfin'@'%' WITH GRANT OPTION;
  FLUSH PRIVILEGES;"

# 2. Отдельная копия кода. Основная ветка — develop, ветки main тут НЕТ.
mkdir -p /home/aiproc/stands
git clone --depth=1 --branch develop https://github.com/aiprocadm/bigfin.git \
          /home/aiproc/stands/bigfin
cd /home/aiproc/stands/bigfin
export PATH=/home/aiproc/.nvm/versions/node/v24.18.0/bin:$PATH
pnpm install --frozen-lockfile

# 3. Настройки (в git не хранятся; секреты генерировать СВОИ: openssl rand -hex 32)
#    .env И packages/server/.env — файлы одинаковые, нужны ОБА:
#    приложение читает свой из packages/server, а CLI миграций — только
#    переменные окружения, файл он не грузит вовсе.
#      PORT=3020, BASE_URL=https://fin.ptsfera.online
#      DB_HOST=127.0.0.1, DB_PORT=3307, DB_USER=bigfin, DB_PASSWORD=<свой>
#      SYSTEM_DB_NAME=bigfin_stand_system
#      TENANT_DB_NAME_PERFIX=bigfin_stand_tenant_
#      QUEUE_HOST=127.0.0.1, QUEUE_PORT=6380
#      APP_JWT_SECRET и JWT_SECRET — свои
chmod 600 .env packages/server/.env

# 4. Сборка
pnpm build

# 5. Системная база
set -a && . ./.env && set +a
(cd packages/server && node dist/cli.js system:migrate:latest && node dist/cli.js system:seed:latest)

# 6. Служба
sudo cp ops/stand/systemd/fin-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now fin-backend

# 7. Демо-организация (после старта службы)
#    signup -> signin -> organization/build; сборка базы организации идёт
#    через очередь и занимает около минуты, в итоге ~94 таблицы.
#    ВНИМАНИЕ: поле входа называется email, а dateFormat принимает только
#    значения из списка (например DD/MM/yyyy — строчные yyyy, не YYYY).

# 8. Публикация
sudo chmod o+x /home/aiproc          # чтобы nginx (www-data) дошёл до dist
sudo cp ops/stand/nginx/fin.ptsfera.online.conf /etc/nginx/sites-available/
sudo cp ops/stand/nginx/bigfin-gzip.conf /etc/nginx/snippets/   # сжатие ответов
sudo ln -sf /etc/nginx/sites-available/fin.ptsfera.online.conf /etc/nginx/sites-enabled/
sudo htpasswd /etc/nginx/.htpasswd-stand demo     # пароль — из менеджера секретов
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d fin.ptsfera.online

# 9. Автообновление
crontab -l 2>/dev/null | { cat; \
  echo '*/10 * * * * /home/aiproc/stands/bigfin/ops/stand/update-stand.sh'; } | crontab -
```

**После certbot** конфиг nginx нельзя перезаписывать целиком — только точечно (`sudo sed -i ...`), иначе дописанные им блоки 443 пропадут и HTTPS отвалится.

---

## 4. Грабли

| Симптом | Причина | Лечение |
|---|---|---|
| **`pnpm install --frozen-lockfile` падает с `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`** | Начиная с pnpm 10 поле `pnpm` в `package.json` больше не читается; `overrides` и `supportedArchitectures` надо держать в `pnpm-workspace.yaml` | Исправлено: настройки перенесены |
| **`pnpm install` падает с `ERR_PNPM_IGNORED_BUILDS`** | Начиная с pnpm 10 установочные скрипты блокируются по умолчанию | Исправлено: нужные пакеты перечислены в `allowBuilds` |
| **Сборка витрины падает: `"Color" is not exported by @tiptap/extension-text-style`** | У `@tiptap/extension-color` версия была указана как `latest`, у остальных пакетов редактора — `2.1.13`. Вышла 3.x — сборка сломалась у всех | Исправлено: версия закреплена на `2.1.13` |
| **Подключение всегда идёт на порт 3306, что бы ни стояло в `DB_PORT`** | Конфиг объявлял `port`, но ни одно из четырёх мест сборки подключения его не передавало | Исправлено: порт передаётся везде |
| **База организации создана, но пустая; в журнале `Unknown database 'bigfin_tenant_…'`** | Префикс из `TENANT_DB_NAME_PERFIX` учитывался наполовину: база создавалась с ним, а подключались по прошитой в код строке | Исправлено: префикс берётся из конфига |
| **Миграции не видят настроек** | CLI поднимает `ConfigModule` **без** `envFilePath` — файл `.env` он не читает вовсе, только переменные окружения | `set -a && . ./.env && set +a` перед запуском |
| **`signin` отвечает 401 на верный пароль** | Поле называется `email` (не `crediential`), а токен в ответе — `access_token` | — |
| **`organization/build` отвечает 400** | `dateFormat` принимает только значения из списка: `DD/MM/yyyy`, а не `DD/MM/YYYY` | — |
| **Окно пароля nginx выскакивает снова и снова, пользоваться невозможно** | Витрина шлёт токен в `Authorization: Bearer` (`hooks/useRequest.tsx`), он вытесняет пропуск basic-auth | `auth_basic off;` внутри `location /api/` (уже в конфиге) |
| **Не открывается в Chrome/Яндексе, хотя `curl` даёт честный 401** | Кириллица в `auth_basic` — по RFC там только ASCII | Realm только латиницей |
| **Страницы долго открываются, особенно первый вход и после обновления стенда** | В общем `nginx.conf` список `gzip_types` закомментирован, а по умолчанию nginx сжимает только HTML: скрипты и стили витрины (4,9 МБ) уходили без сжатия | `sudo bash ops/stand/enable-gzip.sh` — кладёт `ops/stand/nginx/bigfin-gzip.conf` в `/etc/nginx/snippets/` и точечно подключает его в конфиг сайта; при ошибке `nginx -t` всё возвращает. Станет ~1,3 МБ |

---

## 5. «Сайт не открывается» — порядок диагностики

Проверять **снизу вверх**: сначала свой процесс, потом сеть. Обратный порядок однажды стоил суток разбирательства, а причина была на сервере.

```bash
ss -lnt | grep :3020                       # 1. слушает ли порт
systemctl status fin-backend               # 2. строку Active: читать ЦЕЛИКОМ
journalctl -u fin-backend -n 50            # 3. что пишет при падении
docker ps | grep bigfin                    # 4. свои MySQL и Redis подняты?
```

- **`systemctl is-active` ВРЁТ**: в цикле перезапусков отвечает `active`, хотя служба на самом деле `activating (auto-restart)`. Смотреть только полный `systemctl status`.
- **Быстрый разделитель «сервер или сеть»:** на сервере опубликовано несколько стендов, каждый своим процессом на своём порту. Если часть поддоменов открывается, а часть нет — виноват процесс.
- **Hairpin NAT не работает:** запрос с сервера на свой же внешний адрес даёт `код=000`. Это НЕ признак закрытого порта.
- **На сервере поднят локальный прокси** — всегда `curl --noproxy '*'`.

**Внешняя проверка** (WebFetch к этим доменам стабильно врёт «Socket is closed»):

```bash
curl --noproxy '*' -H "Accept: application/json" \
  "https://check-host.net/check-http?host=https%3A%2F%2Ffin.ptsfera.online&max_nodes=4"
curl --noproxy '*' -H "Accept: application/json" \
  "https://check-host.net/check-result/<request_id>"
```

`401` от чужих машин = стенд работает и защищён паролем.

---

## 6. Что стенд НЕ показывает

- **Только влитую `develop`.** Незалитая ветка на стенде не появится.
- **Задержка до ~15 минут** между мержем и появлением на стенде (10 минут расписания + сборка монорепо).
- **Сломанный код в `develop` стенд не уронит**, но и не покажет: он останется на прошлой рабочей версии, а причина будет в журнале обновлений.
