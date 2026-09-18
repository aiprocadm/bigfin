// © 2026 Bigfin
import { checkWebhookUrl, isAllowedWebhookUrl } from './webhookUrl';

/**
 * Этап 15 ТЗ, вебхуки. Адрес называет пользователь, а запрос делает НАШ
 * сервер. Значит, пользователь может попросить сервер сходить туда, куда сам
 * он не дотянется — внутрь нашей сети.
 */
describe('checkWebhookUrl', () => {
  it('обычный внешний адрес проходит', () => {
    expect(checkWebhookUrl('https://example.com/hooks/bigfin')).toBeNull();
    expect(checkWebhookUrl('http://example.com:8080/hook')).toBeNull();
  });

  it('адрес внутри самой машины не проходит', () => {
    expect(checkWebhookUrl('http://localhost:3000/hook')).toBe(
      'private_address',
    );
    expect(checkWebhookUrl('http://127.0.0.1/hook')).toBe('private_address');
    expect(checkWebhookUrl('http://[::1]/hook')).toBe('private_address');
  });

  it('адрес метаданных облака не проходит', () => {
    // По нему отдаются ключи доступа виртуальной машины — классическая цель.
    expect(checkWebhookUrl('http://169.254.169.254/latest/meta-data/')).toBe(
      'private_address',
    );
  });

  it('внутренние сети не проходят', () => {
    expect(checkWebhookUrl('http://10.0.0.5/hook')).toBe('private_address');
    expect(checkWebhookUrl('http://192.168.1.10/hook')).toBe('private_address');
    expect(checkWebhookUrl('http://172.16.0.1/hook')).toBe('private_address');
    expect(checkWebhookUrl('http://172.31.255.254/hook')).toBe(
      'private_address',
    );
  });

  it('соседние с внутренними адреса проходят', () => {
    // Граница диапазона 172.16–172.31: 172.15 и 172.32 — обычные адреса,
    // и запрещать их было бы ошибкой в другую сторону.
    expect(checkWebhookUrl('http://172.15.0.1/hook')).toBeNull();
    expect(checkWebhookUrl('http://172.32.0.1/hook')).toBeNull();
    expect(checkWebhookUrl('http://11.0.0.1/hook')).toBeNull();
  });

  it('не веб-протоколы не проходят', () => {
    // Это не адреса доставки, а способ заставить сервер прочитать что-то
    // у себя же.
    expect(checkWebhookUrl('file:///etc/passwd')).toBe('protocol_not_allowed');
    expect(checkWebhookUrl('ftp://example.com/x')).toBe(
      'protocol_not_allowed',
    );
  });

  it('не адрес — это «кривой адрес», а не разрешение', () => {
    expect(checkWebhookUrl('просто текст')).toBe('malformed');
    expect(checkWebhookUrl('')).toBe('malformed');
    expect(checkWebhookUrl(null as unknown as string)).toBe('malformed');
  });

  it('регистр в имени узла не обходит запрет', () => {
    expect(checkWebhookUrl('http://LOCALHOST/hook')).toBe('private_address');
  });

  it('isAllowedWebhookUrl отвечает да/нет', () => {
    expect(isAllowedWebhookUrl('https://example.com/hook')).toBe(true);
    expect(isAllowedWebhookUrl('http://127.0.0.1/hook')).toBe(false);
  });
});
