// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { MAIL_QUEUE_JOB_OPTIONS } from './mailQueueJobOptions';
import { activeCode } from '../../testing/activeCode';

/**
 * Шаг Ф2 карты v10: у почтовых очередей есть повторы с затуханием.
 *
 * До этого ни одна очередь не задавала попыток: временный сбой почты превращал
 * письмо в потерю навсегда с первого раза — в очередях стенда молча лежали
 * 22 упавшие почтовые задачи. Повторы не чинят видимость (это шаг Ф1), но
 * закрывают самый частый случай: почта мигнула и вернулась.
 */
const SRC_DIR = path.resolve(__dirname, '..', '..');

/** Все почтовые очереди продукта — письма людям. */
const MAIL_QUEUES = [
  'SendSaleInvoiceQueue',
  'SendSaleReceiptMailQueue',
  'SendSaleEstimateMailQueue',
  'SEND_PAYMENT_RECEIVED_MAIL_QUEUE',
  'SendInviteUserMailQueue',
  'SendResetPasswordMailQueue',
  'SendSignupVerificationMailQueue',
];

const allSources = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return allSources(full);
    return entry.name.endsWith('.module.ts') ? [full] : [];
  });

describe('повторы почтовых очередей', () => {
  it('попыток несколько и затухание растёт от минуты', () => {
    // Пять попыток за ~полчаса: минутный сбой почты покрыт с запасом, а
    // окончательное падение (для шага Ф1) наступает в пределах часа.
    expect(MAIL_QUEUE_JOB_OPTIONS.attempts).toBeGreaterThanOrEqual(3);
    expect(MAIL_QUEUE_JOB_OPTIONS.backoff).toEqual({
      type: 'exponential',
      delay: expect.any(Number),
    });
    expect((MAIL_QUEUE_JOB_OPTIONS.backoff as any).delay).toBeGreaterThanOrEqual(
      60_000,
    );
  });

  it('каждая почтовая очередь регистрируется с повторами', () => {
    const sources = allSources(SRC_DIR).map((file) => ({
      file,
      text: activeCode(fs.readFileSync(file, 'utf8')),
    }));

    const missing: string[] = [];
    const unregistered: string[] = [];

    MAIL_QUEUES.forEach((queue) => {
      const registrations = sources.filter(({ text }) =>
        new RegExp(`registerQueue\\(\\{[^}]*name: ${queue}\\b`).test(text),
      );

      if (!registrations.length) {
        // Иначе сторож сторожит пустоту: очередь переименовали — тест обязан
        // упасть, а не молча пропустить.
        unregistered.push(queue);
        return;
      }
      registrations.forEach(({ file, text }) => {
        const withOptions = new RegExp(
          `registerQueue\\(\\{[^}]*name: ${queue}\\b[^}]*defaultJobOptions: MAIL_QUEUE_JOB_OPTIONS`,
        );
        if (!withOptions.test(text)) {
          missing.push(`${queue} (${path.relative(SRC_DIR, file)})`);
        }
      });
    });

    expect({ unregistered, missing }).toEqual({ unregistered: [], missing: [] });
  });
});
