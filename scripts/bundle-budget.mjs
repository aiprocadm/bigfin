#!/usr/bin/env node
/**
 * Сторож размера сборки витрины (UI-055-3 ТЗ-4, бюджет скорости R24).
 *
 * Считает после `vite build` (папка packages/webapp/dist) три числа в gzip —
 * так файлы идут по сети:
 *   - first  — что браузер качает до первого экрана: скрипты и предзагрузки
 *              из index.html (современная сборка, без legacy);
 *   - total  — весь JS витрины;
 *   - chunk  — самый крупный кусок.
 * Число выше порога — выход с ошибкой и список самых тяжёлых кусков.
 *
 * ПОРОГ МОЖЕТ ТОЛЬКО УМЕНЬШАТЬСЯ. Если в базовой ветке (BUNDLE_BUDGET_BASE,
 * по умолчанию origin/develop) этот файл уже есть и порог там ниже —
 * сторож падает: поднять бюджет «чтобы прошло» нельзя, можно только
 * похудеть. Опустить порог после чистки — можно и нужно.
 *
 *   node scripts/bundle-budget.mjs            проверить
 *   node scripts/bundle-budget.mjs --report   только напечатать числа
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Пороги, байты gzip. Замер этапа 55 (30.09.2026): до первого экрана
// 935 КБ, весь JS 2480 КБ, крупнейший кусок 409 КБ — плюс запас ~3 %.
export const BUDGET = {
  first: 990_000,
  total: 2_620_000,
  chunk: 432_000,
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'packages/webapp/dist');

const gzipSize = (file) => zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length;
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} КБ`;

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(full);
    // legacy-куски грузит только старый браузер, и вместо, а не вместе.
    return entry.name.endsWith('.js') && !entry.name.includes('-legacy') ? [full] : [];
  });
}

export function firstLoadFiles(html) {
  const refs = [
    ...html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g),
    ...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g),
  ].map((m) => m[1]);
  return [...new Set(refs)].filter((ref) => ref.endsWith('.js') && !ref.startsWith('http'));
}

export function measure(dist = DIST) {
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const sizes = new Map(jsFiles(dist).map((file) => [path.relative(dist, file), gzipSize(file)]));
  const first = firstLoadFiles(html).reduce((sum, ref) => sum + (sizes.get(ref.replace(/^\//, '')) ?? 0), 0);
  const total = [...sizes.values()].reduce((a, b) => a + b, 0);
  const heaviest = [...sizes.entries()].sort((a, b) => b[1] - a[1]);
  return { first, total, chunk: heaviest[0]?.[1] ?? 0, heaviest };
}

/** Пороги из версии этого файла в базовой ветке; null — файла там ещё нет. */
export function baseBudget(ref = process.env.BUNDLE_BUDGET_BASE || 'origin/develop') {
  try {
    const text = execFileSync('git', ['show', `${ref}:scripts/bundle-budget.mjs`], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return parseBudget(text);
  } catch {
    return null;
  }
}

export function parseBudget(text) {
  const block = text.match(/export const BUDGET = \{([\s\S]*?)\};/)?.[1] ?? '';
  const entries = [...block.matchAll(/(\w+):\s*([\d_]+)/g)].map(([, k, v]) => [k, Number(v.replace(/_/g, ''))]);
  return entries.length ? Object.fromEntries(entries) : null;
}

export function raisedLimits(current, base) {
  if (!base) return [];
  return Object.keys(current).filter((key) => base[key] !== undefined && current[key] > base[key]);
}

function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('Нет сборки: сначала pnpm --filter @bigfin/webapp build');
    process.exit(2);
  }
  const m = measure();
  console.log(`До первого экрана: ${kb(m.first)} (порог ${kb(BUDGET.first)})`);
  console.log(`Весь JS:           ${kb(m.total)} (порог ${kb(BUDGET.total)})`);
  console.log(`Крупнейший кусок:  ${kb(m.chunk)} (порог ${kb(BUDGET.chunk)})`);
  if (process.argv.includes('--report')) {
    m.heaviest.slice(0, 10).forEach(([file, size]) => console.log(`  ${kb(size).padStart(8)}  ${file}`));
    return;
  }

  const problems = [];
  for (const key of Object.keys(BUDGET)) {
    if (m[key] > BUDGET[key]) problems.push(`${key}: ${kb(m[key])} больше порога ${kb(BUDGET[key])}`);
  }
  const raised = raisedLimits(BUDGET, baseBudget());
  if (raised.length) problems.push(`порог поднят относительно базовой ветки: ${raised.join(', ')} — порог может только уменьшаться`);

  if (problems.length) {
    console.error('\nБюджет сборки нарушен:\n  ' + problems.join('\n  '));
    console.error('\nСамые тяжёлые куски:');
    m.heaviest.slice(0, 8).forEach(([file, size]) => console.error(`  ${kb(size).padStart(8)}  ${file}`));
    process.exit(1);
  }
  console.log('\n✅ Бюджет сборки соблюдён.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
