# start-local.ps1 — запуск локального стека Bigfin одной командой.
#
#   powershell -ExecutionPolicy Bypass -File start-local.ps1
#
# Скрипт безопасно запускать повторно: всё, что уже работает, он пропускает.
# Параметры:
#   -NoWebapp        не запускать вебапп (например, когда его запускает preview-сервис)
#   -SkipMigrations  пропустить миграции (экономит ~1 минуту, если БД точно актуальна)

param(
  [switch]$NoWebapp,
  [switch]$SkipMigrations
)

# 'Continue', а не 'Stop': docker и pnpm пишут предупреждения в stderr, и в
# Windows PowerShell 5 режим 'Stop' превращает их в фатальные ошибки.
# Реальные сбои ловим явными проверками $LASTEXITCODE после каждой команды.
$ErrorActionPreference = 'Continue'
$root = $PSScriptRoot

function Step($msg)  { Write-Host "==> $msg" -ForegroundColor Cyan }
function Fail($msg)  { Write-Host "ОШИБКА: $msg" -ForegroundColor Red; exit 1 }
function PortBusy($p) { [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) }

# HTTP-проверки через curl.exe (встроен в Windows 10+), чтобы одинаково работать в PS 5 и 7
function HttpCode($url) {
  try { & curl.exe -s -o NUL -w '%{http_code}' --max-time 3 $url 2>$null } catch { '000' }
}

# ---------- 1. Node 18 (fnm) ----------
$fnmNode = Join-Path $env:APPDATA 'fnm\node-versions\v18.16.1\installation'
if (Test-Path (Join-Path $fnmNode 'node.exe')) {
  $env:Path = "$fnmNode;$env:Path"
}
$nodeV = (& node -v)
if ($nodeV -notlike 'v18.*') {
  Fail "Активный Node — $nodeV, а проекту нужен 18.16.1. Установите: fnm install 18.16.1"
}
Step "Node $nodeV — ок"

# ---------- 2. env-файл сервера ----------
$envFile = Join-Path $root 'packages\server\.env'
if (-not (Test-Path $envFile)) {
  Fail "Нет packages\server\.env. Скопируйте packages\server\.env.example в .env и заполните DB_* и JWT_SECRET."
}

# ---------- 3. Docker Desktop ----------
& docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Step 'Docker не отвечает — запускаю Docker Desktop...'
  $dockerDesktop = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dockerDesktop) { Start-Process $dockerDesktop | Out-Null }
  $up = $false
  for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 2
    & docker info 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $up = $true; break }
  }
  if (-not $up) { Fail 'Docker так и не запустился за 90 секунд. Откройте Docker Desktop вручную и повторите.' }
}

# ---------- 4. MariaDB + Redis ----------
Step 'Запускаю MariaDB и Redis (контейнеры bigfin-*)...'
$composeOut = & docker compose --env-file $envFile up -d mariadb redis 2>&1
if ($LASTEXITCODE -ne 0) {
  $composeOut | ForEach-Object { Write-Host $_ }
  Fail 'docker compose up завершился с ошибкой — вывод выше.'
}

# Ждём готовности базы (пароль root берём из .env)
$rootPwdLine = Select-String -Path $envFile -Pattern '^DB_ROOT_PASSWORD=(.*)$'
$dbRootPwd = if ($rootPwdLine) { $rootPwdLine.Matches[0].Groups[1].Value.Trim() } else { 'root' }
Step 'Жду готовности базы данных...'
$dbOk = $false
for ($i = 0; $i -lt 30; $i++) {
  & docker exec bigfin-mariadb-1 mysqladmin ping -uroot "-p$dbRootPwd" --silent 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $dbOk = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $dbOk) { Fail 'База данных не ответила за 60 секунд. Посмотрите: docker logs bigfin-mariadb-1' }

# ---------- 5. Миграции системной БД (повторный запуск безопасен) ----------
if (-not $SkipMigrations) {
  Step 'Применяю миграции системной БД (~1 минута, безопасно повторять)...'
  Push-Location (Join-Path $root 'packages\server')
  try {
    & pnpm run cli:system:migrate:latest
    if ($LASTEXITCODE -ne 0) { Fail 'Миграции упали — смотрите вывод выше.' }
  } finally { Pop-Location }
}

# ---------- 6. API-сервер :3000 ----------
if (PortBusy 3000) {
  Step 'Порт 3000 уже занят — считаю, что API-сервер работает, пропускаю.'
} else {
  Step 'Запускаю API-сервер в отдельном окне (порт 3000)...'
  Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "`$host.UI.RawUI.WindowTitle='Bigfin API :3000'; `$env:Path='$fnmNode;'+`$env:Path; Set-Location '$root\packages\server'; pnpm run start:dev"
  ) | Out-Null
}

Step 'Жду ответа API на http://localhost:3000 (первый запуск — до 3 минут)...'
$apiOk = $false
for ($i = 0; $i -lt 90; $i++) {
  $code = HttpCode 'http://localhost:3000/api/'
  if ($code -match '^(2|3|4)\d\d$') { $apiOk = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $apiOk) { Fail 'API не ответил за 3 минуты. Посмотрите окно "Bigfin API :3000" — там будет ошибка.' }

# ---------- 7. Тестовый аккаунт ----------
$email = 'founder@bigfin.local'
$password = 'Bigfin2026!dev'
$tmpJson = Join-Path $env:TEMP 'bigfin-local-auth.json'

@{ email = $email; password = $password } | ConvertTo-Json -Compress | Set-Content -Path $tmpJson -Encoding ascii
$signinCode = & curl.exe -s -o NUL -w '%{http_code}' -X POST http://localhost:3000/api/auth/signin -H 'Content-Type: application/json' -d "@$tmpJson"

if ($signinCode -ne '201' -and $signinCode -ne '200') {
  Step 'Тестовый аккаунт не входит — создаю заново...'
  @{ firstName = 'Основатель'; lastName = 'Bigfin'; email = $email; password = $password } |
    ConvertTo-Json -Compress | Set-Content -Path $tmpJson -Encoding ascii
  $signupCode = & curl.exe -s -o NUL -w '%{http_code}' -X POST http://localhost:3000/api/auth/signup -H 'Content-Type: application/json' -d "@$tmpJson"
  if ($signupCode -ne '201') {
    Write-Warning "Не удалось создать аккаунт (HTTP $signupCode). Возможно, аккаунт существует с другим паролем — войдите своими данными."
  }
}
Remove-Item $tmpJson -ErrorAction SilentlyContinue

# ---------- 8. Вебапп :4000 ----------
if (-not $NoWebapp) {
  if (PortBusy 4000) {
    Step 'Порт 4000 уже занят — считаю, что вебапп работает, пропускаю.'
  } else {
    Step 'Запускаю вебапп в отдельном окне (порт 4000)...'
    Start-Process powershell -ArgumentList @(
      '-NoExit', '-Command',
      "`$host.UI.RawUI.WindowTitle='Bigfin webapp :4000'; `$env:Path='$fnmNode;'+`$env:Path; Set-Location '$root\packages\webapp'; pnpm run dev"
    ) | Out-Null
  }
  Step 'Жду ответа вебаппа на http://localhost:4000...'
  $webOk = $false
  for ($i = 0; $i -lt 60; $i++) {
    if ((HttpCode 'http://localhost:4000/') -eq '200') { $webOk = $true; break }
    Start-Sleep -Seconds 2
  }
  if (-not $webOk) { Write-Warning 'Вебапп не ответил за 2 минуты — посмотрите окно "Bigfin webapp :4000".' }
}

# ---------- Итог ----------
Write-Host ''
Write-Host '================= Bigfin запущен =================' -ForegroundColor Green
Write-Host "  Приложение:  http://localhost:4000"
Write-Host "  Email:       $email"
Write-Host "  Пароль:      $password"
Write-Host ''
Write-Host '  Остановить серверы — закройте их окна.'
Write-Host '  Остановить базу:   docker compose --env-file packages/server/.env stop'
Write-Host '==================================================' -ForegroundColor Green
