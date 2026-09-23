// © 2026 Bigfin
import { attemptOutcome, deliveryHeaders } from './webhookDelivery';
import { verifySignature } from './webhooks';

/** FT-092 ТЗ-3: доставка вебхука. */
describe('доставка вебхука', () => {
  it('AC 4: заголовки X-Bigfin-Event/Timestamp/Signature, подпись проверяется', () => {
    const body = JSON.stringify({ event: 'transaction.created', data: { id: 7 } });
    const headers = deliveryHeaders('transaction.created', body, 'секрет', 1_800_000_000, 15);
    expect(headers['X-Bigfin-Event']).toBe('transaction.created');
    expect(headers['X-Bigfin-Timestamp']).toBe('1800000000');
    expect(verifySignature(body, 'секрет', 1_800_000_000, headers['X-Bigfin-Signature'], 1_800_000_010)).toBe(true);
    expect(verifySignature(body + ' ', 'секрет', 1_800_000_000, headers['X-Bigfin-Signature'], 1_800_000_010)).toBe(false);
  });

  it('AC 5: недоступный подписчик — 6 попыток с удвоением паузы, потом стоп', () => {
    const delays: Array<number | null> = [];
    let attempts = 0;
    for (let i = 0; i < 6; i += 1) {
      const outcome = attemptOutcome(attempts, null, 'ECONNREFUSED');
      attempts = outcome.attempts;
      delays.push(outcome.retryInSeconds);
    }
    expect(attempts).toBe(6);
    expect(delays).toEqual([30, 60, 120, 240, 480, null]);
  });

  it('2xx — доставлено; 4xx — без повтора; 429 и 5xx — повтор', () => {
    expect(attemptOutcome(0, 204, null)).toMatchObject({ delivered: true, retryInSeconds: null, error: null });
    expect(attemptOutcome(0, 404, null)).toMatchObject({ delivered: false, retryInSeconds: null, error: 'HTTP 404' });
    expect(attemptOutcome(0, 429, null).retryInSeconds).toBe(30);
    expect(attemptOutcome(1, 503, null).retryInSeconds).toBe(60);
  });
});
