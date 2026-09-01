// © 2026 Bigfin
import { AuthMailSubscriber } from './AuthMail.subscriber';
import { activeCode } from '../../../testing/activeCode';

/**
 * Шаг Ф3 карты v10: сбой постановки письма в очередь не глотается.
 *
 * Если очередь недоступна, а ошибка проглочена, человек получает «успех» и
 * ждёт письмо подтверждения, которое никогда не придёт, — и даже не знает,
 * что надо нажать «отправить повторно». Честная ошибка лучше тихой потери.
 */
const buildSubscriber = ({ addFails }: { addFails: boolean }) => {
  const queue = {
    add: addFails
      ? jest.fn().mockRejectedValue(new Error('OOM command not allowed'))
      : jest.fn().mockResolvedValue(undefined),
  };

  const subscriber = new AuthMailSubscriber(queue as any, queue as any);

  return { subscriber, queue };
};

const payload = {
  user: {
    email: 'new@bigfin.local',
    firstName: 'Новый',
    verifyToken: 'token-1',
  },
} as any;

describe('письмо подтверждения регистрации', () => {
  it('сбой постановки в очередь пробрасывается, а не глотается', async () => {
    const { subscriber } = buildSubscriber({ addFails: true });

    await expect(
      subscriber.handleSignupSendVerificationMail(payload),
    ).rejects.toThrow('OOM');
  });

  it('при живой очереди письмо ставится', async () => {
    const { subscriber, queue } = buildSubscriber({ addFails: false });

    await subscriber.handleSignupSendVerificationMail(payload);
    expect(queue.add).toHaveBeenCalledTimes(1);
  });
});

describe('ошибки обработчиков не глушатся Nest-ом', () => {
  it('у всех событий подписчика стоит suppressErrors: false', () => {
    // Живая проба это вскрыла: проброс из обработчика не доходит до клиента,
    // пока Nest глушит ошибки событий по умолчанию — тот же класс, что
    // чинился у подписчиков журнала (#206). Без пометки весь смысл Ф3
    // теряется молча.
    const fs = require('fs');
    const source = activeCode(
      fs.readFileSync(require.resolve('./AuthMail.subscriber'), 'utf8'),
    );

    const onEvents = source.match(/@OnEvent\([^)]*\)/g) ?? [];

    expect(onEvents.length).toBeGreaterThanOrEqual(3);
    onEvents.forEach((decorator: string) => {
      expect(decorator).toContain('suppressErrors: false');
    });
  });
});

describe('письмо восстановления пароля', () => {
  it('сбой постановки уже пробрасывается — закрепляем', async () => {
    const { subscriber } = buildSubscriber({ addFails: true });

    await expect(
      subscriber.handleSendResetPasswordMail({
        user: { email: 'x@bigfin.local' },
        token: 't',
      } as any),
    ).rejects.toThrow('OOM');
  });
});
