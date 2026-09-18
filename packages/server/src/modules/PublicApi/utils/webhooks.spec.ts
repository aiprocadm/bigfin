// © 2026 Bigfin
import {
  MAX_DELIVERY_ATTEMPTS,
  SIGNATURE_TOLERANCE_SECONDS,
  WEBHOOK_EVENTS,
  isKnownEvent,
  nextRetryDelaySeconds,
  shouldRetry,
  signPayload,
  verifySignature,
} from './webhooks';

/**
 * Этап 15 ТЗ. Вебхуки.
 *
 * Адрес вебхука рано или поздно узнают. Без подписи любой сможет прислать
 * «кассовый разрыв» или «операция создана», и получатель этому поверит.
 */
const NOW = 1_800_000_000;

describe('события вебхуков', () => {
  it('минимум из ТЗ на месте', () => {
    expect(WEBHOOK_EVENTS).toEqual([
      'transaction.created',
      'transaction.article_changed',
      'payment_request.approved',
      'cash_gap.forecasted',
    ]);
  });

  it('незнакомое событие не принимается', () => {
    // Иначе человек подпишется на опечатку и будет ждать вызовов вечно.
    expect(isKnownEvent('transaction.crated')).toBe(false);
  });
});

describe('подпись доставки', () => {
  const payload = JSON.stringify({ id: 1, amount: 100 });

  it('верная подпись принимается', () => {
    const signature = signPayload(payload, 'секрет', NOW);

    expect(verifySignature(payload, 'секрет', NOW, signature, NOW)).toBe(true);
  });

  it('подпись чужим секретом не проходит', () => {
    const signature = signPayload(payload, 'чужой', NOW);

    expect(verifySignature(payload, 'секрет', NOW, signature, NOW)).toBe(
      false,
    );
  });

  it('подменённое тело не проходит', () => {
    const signature = signPayload(payload, 'секрет', NOW);

    expect(
      verifySignature('{"amount":999999}', 'секрет', NOW, signature, NOW),
    ).toBe(false);
  });

  it('старая подпись отвергается, даже будучи верной', () => {
    // Без этого перехваченный вызов можно повторять бесконечно:
    // подпись-то верная, и получатель не отличит повтор от события.
    const signature = signPayload(payload, 'секрет', NOW);
    const muchLater = NOW + SIGNATURE_TOLERANCE_SECONDS + 1;

    expect(verifySignature(payload, 'секрет', NOW, signature, muchLater)).toBe(
      false,
    );
  });

  it('время входит в подпись', () => {
    // Если бы подписывалось только тело, подпись годилась бы навсегда.
    expect(signPayload(payload, 'секрет', NOW)).not.toBe(
      signPayload(payload, 'секрет', NOW + 1),
    );
  });

  it('мусорное время не проходит как свежее', () => {
    // `Math.abs(NaN) > 300` — это «нет», то есть проверка свежести молча
    // пропустила бы что угодно, притворяясь рабочей.
    const signature = signPayload(payload, 'секрет', NaN as unknown as number);

    expect(
      verifySignature(
        payload,
        'секрет',
        NaN as unknown as number,
        signature,
        NOW,
      ),
    ).toBe(false);
  });

  it('мусор вместо подписи не роняет проверку', () => {
    expect(verifySignature(payload, 'секрет', NOW, 'не-подпись', NOW)).toBe(
      false,
    );
  });
});

describe('повторные попытки', () => {
  it('задержка удваивается', () => {
    // Равномерные повторы добивают получателя, который и так лежит:
    // он поднимется и тут же получит шквал накопившихся вызовов.
    expect(nextRetryDelaySeconds(1)).toBe(30);
    expect(nextRetryDelaySeconds(2)).toBe(60);
    expect(nextRetryDelaySeconds(3)).toBe(120);
  });

  it('после последней попытки повторов нет', () => {
    expect(nextRetryDelaySeconds(MAX_DELIVERY_ATTEMPTS)).toBeNull();
  });

  it('бессмысленный номер попытки не даёт задержки', () => {
    expect(nextRetryDelaySeconds(0)).toBeNull();
    expect(nextRetryDelaySeconds(-1)).toBeNull();
  });
});

describe('shouldRetry', () => {
  it('сетевой сбой повторяем', () => {
    expect(shouldRetry(null)).toBe(true);
  });

  it('ошибку сервера получателя повторяем', () => {
    expect(shouldRetry(500)).toBe(true);
    expect(shouldRetry(503)).toBe(true);
  });

  it('4xx НЕ повторяем', () => {
    // «Твой запрос неверен» не станет верным от повтора — мы просто будем
    // долбить чужой сервер до упора.
    expect(shouldRetry(400)).toBe(false);
    expect(shouldRetry(404)).toBe(false);
    expect(shouldRetry(403)).toBe(false);
  });

  it('408 и 429 повторяем: они сами просят', () => {
    expect(shouldRetry(408)).toBe(true);
    expect(shouldRetry(429)).toBe(true);
  });

  it('успех не повторяем', () => {
    expect(shouldRetry(200)).toBe(false);
    expect(shouldRetry(204)).toBe(false);
  });
});
