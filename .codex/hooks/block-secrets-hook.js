#!/usr/bin/env node
/**
 * .claude/hooks/block-secrets-hook.js
 *
 * PreToolUse-хук для Claude Code. Срабатывает ДО Edit/Write/MultiEdit.
 * Если file_path соответствует защищённому шаблону — exit 2 (Claude увидит
 * причину блокировки и предложит вам решить). Иначе exit 0 (продолжаем).
 *
 * Откат: удалить файл и убрать PreToolUse секцию из settings.local.json
 * (или: node apply-block-secrets-hook.js --revert).
 */
let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input);
    const filePath = (payload && payload.tool_input && payload.tool_input.file_path) || '';
    if (!filePath) {
      process.exit(0); // no path → nothing to block
    }
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();
    const fileName = normalized.split('/').pop();

    const patterns = [
      { re: /(^|\/)\.env(\.[a-z0-9_-]+)?$/, label: '.env or .env.* file' },
      { re: /\.secrets?$/, label: 'secrets file' },
      { re: /(^|\/)pnpm-lock\.yaml$/, label: 'pnpm-lock.yaml' },
      { re: /(^|\/)package-lock\.json$/, label: 'package-lock.json' },
      { re: /(^|\/)yarn\.lock$/, label: 'yarn.lock' },
      { re: /docker-compose\.prod\.yml$/, label: 'docker-compose.prod.yml' },
      { re: /\.pem$/, label: 'PEM key file' },
      { re: /\.key$/, label: 'private key file' },
    ];

    for (const p of patterns) {
      if (p.re.test(normalized)) {
        // exit 2 = blocking error in Claude Code hooks
        console.error(`[block-secrets] BLOCKED: ${fileName} (${p.label}).`);
        console.error('Reason: this file is protected by .claude/hooks/block-secrets-hook.js');
        console.error('Override: edit the file manually, or run "node apply-block-secrets-hook.js --revert" to disable the hook.');
        process.exit(2);
      }
    }
    process.exit(0);
  } catch (e) {
    // Не блокируем при внутренней ошибке самого хука — не делаем хуже.
    console.error(`[block-secrets] internal error: ${e.message}`);
    process.exit(0);
  }
});
