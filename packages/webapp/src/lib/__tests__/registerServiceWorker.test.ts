import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../registerServiceWorker';

function mockServiceWorkerContainer() {
  const registration = {
    waiting: null as null | { postMessage: (m: unknown) => void },
    installing: null,
    addEventListener: vi.fn(),
  };
  const container = {
    register: vi.fn().mockResolvedValue(registration),
    getRegistrations: vi.fn().mockResolvedValue([]),
    addEventListener: vi.fn(),
    controller: null,
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    value: container,
    configurable: true,
  });
  return { container, registration };
}

afterEach(() => {
  vi.unstubAllEnvs();
  // @ts-expect-error очистка мока
  delete navigator.serviceWorker;
});

describe('registerServiceWorker', () => {
  it('в prod регистрирует /sw.js', async () => {
    vi.stubEnv('PROD', true);
    const { container } = mockServiceWorkerContainer();

    registerServiceWorker();
    await Promise.resolve();

    expect(container.register).toHaveBeenCalledWith('/sw.js');
  });

  it('в dev снимает существующие регистрации и не регистрирует', async () => {
    vi.stubEnv('PROD', false);
    const { container } = mockServiceWorkerContainer();

    registerServiceWorker();
    await Promise.resolve();

    expect(container.register).not.toHaveBeenCalled();
    expect(container.getRegistrations).toHaveBeenCalled();
  });

  it('воркеру в waiting сразу шлётся SKIP_WAITING', async () => {
    vi.stubEnv('PROD', true);
    const { registration } = mockServiceWorkerContainer();
    const postMessage = vi.fn();
    registration.waiting = { postMessage };

    registerServiceWorker();
    await Promise.resolve();
    await Promise.resolve();

    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('без поддержки serviceWorker молча выходит', () => {
    vi.stubEnv('PROD', true);
    expect(() => registerServiceWorker()).not.toThrow();
  });
});
