#!/usr/bin/env node
/**
 * .claude/hooks/lang-check-hook.js
 *
 * PostToolUse-хук для Claude Code. Срабатывает после Edit/Write/MultiEdit.
 * Если правка была в файле перевода (packages/webapp/src/lang/**\/*.json) —
 * запускает packages/webapp/scripts/lang-check.js. В остальных случаях молча
 * завершается с exit 0, не блокируя другие инструменты.
 *
 * Зачем wrapper: settings.local.json держит ОДНУ строку команды; вся логика
 * (парсинг payload, проверка пути, запуск скрипта) живёт здесь — это легче
 * читать, дебажить и откатывать.
 *
 * Откат: удалить этот файл и секцию "hooks" из settings.local.json.
 */
let input = '';
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input);
    const filePath = (payload && payload.tool_input && payload.tool_input.file_path) || '';

    // Срабатываем только на JSON внутри packages/webapp/src/lang/
    // \\\\ матчит и Windows-разделители (\\) и Unix-овые (/) после escape.
    const isLangFile = /packages[\\/]webapp[\\/]src[\\/]lang[\\/].+\.json$/i.test(filePath);
    if (!isLangFile) {
      process.exit(0);
    }

    const { execSync } = require('child_process');
    const path = require('path');
    const langCheck = path.resolve(
      __dirname,
      '..',
      '..',
      'bigcapital',
      'packages',
      'webapp',
      'scripts',
      'lang-check.js'
    );

    // stdio: 'inherit' — вывод lang-check уйдёт в транскрипт Claude Code,
    // чтобы вы увидели missing/extra keys прямо в чате.
    execSync(`node "${langCheck}"`, { stdio: 'inherit' });
  } catch (e) {
    // Не блокируем поток других хуков и инструментов при внутренней ошибке.
    console.error(`[lang-check-hook] internal error: ${e.message}`);
    process.exit(0);
  }
});
