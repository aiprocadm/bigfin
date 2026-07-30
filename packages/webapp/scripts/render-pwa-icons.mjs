// Рендер PNG-иконок PWA из public/pwa/icon*.svg головным Chromium.
//
// Запуск (из packages/webapp):  node scripts/render-pwa-icons.mjs
// Требуется установленный Chromium (ищется в кэше Playwright либо
// задаётся переменной CHROME_BIN). PNG кладутся в public/pwa/ и коммитятся —
// сборка приложения от этого скрипта не зависит.
import { execFileSync } from 'child_process';
import { globSync } from 'fs';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const chrome =
  process.env.CHROME_BIN ??
  globSync(
    join(
      process.env.HOME ?? '',
      '.cache/ms-playwright/chromium-*/chrome-linux*/chrome',
    ),
  )[0];

if (!chrome) {
  console.error('Chromium не найден: задайте CHROME_BIN');
  process.exit(1);
}

const outDir = resolve('public/pwa');
const work = mkdtempSync(join(tmpdir(), 'pwa-icons-'));
copyFileSync(join(outDir, 'icon.svg'), join(work, 'icon.svg'));
copyFileSync(join(outDir, 'icon-maskable.svg'), join(work, 'icon-maskable.svg'));

const PAGE = (svg) =>
  `<!doctype html><html><head><style>html,body{margin:0;padding:0}img{display:block;width:100vw;height:100vh}</style></head><body><img src="${svg}"></body></html>`;
writeFileSync(join(work, 'plain.html'), PAGE('icon.svg'));
writeFileSync(join(work, 'maskable.html'), PAGE('icon-maskable.svg'));

const RENDERS = [
  { page: 'plain.html', size: 192, out: 'icon-192.png' },
  { page: 'plain.html', size: 512, out: 'icon-512.png' },
  { page: 'maskable.html', size: 512, out: 'icon-maskable-512.png' },
  // iOS сам скругляет углы — иконка должна заполнять весь квадрат.
  { page: 'maskable.html', size: 180, out: 'apple-touch-icon.png' },
];

// Библиотеки Chromium без sudo: если есть ~/.local/pw-libs (см. настройку
// Playwright на тестовом сервере) — добавляем в LD_LIBRARY_PATH.
const pwLibs = join(
  process.env.HOME ?? '',
  '.local/pw-libs/root/usr/lib/x86_64-linux-gnu',
);
const env = {
  ...process.env,
  LD_LIBRARY_PATH: [pwLibs, process.env.LD_LIBRARY_PATH]
    .filter(Boolean)
    .join(':'),
};

for (const { page, size, out } of RENDERS) {
  execFileSync(chrome, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    `--screenshot=${join(outDir, out)}`,
    `--window-size=${size},${size}`,
    '--hide-scrollbars',
    `file://${join(work, page)}`,
  ], { env });
  console.log(`${out}: ${size}×${size}`);
}
rmSync(work, { recursive: true, force: true });
