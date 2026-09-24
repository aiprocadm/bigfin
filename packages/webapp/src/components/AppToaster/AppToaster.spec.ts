import fs from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sonner = vi.hoisted(() => {
  const toast: any = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  toast.warning = vi.fn();
  toast.info = vi.fn();
  toast.dismiss = vi.fn();
  return { toast };
});
vi.mock('sonner', () => sonner);

import { activeCode } from '@/testing/activeCode';
import { AppToaster } from './index';

const { toast } = sonner;

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * UI-044-9 ТЗ-4. Один вид уведомлений на весь продукт: прежний вызов
 * `AppToaster.show({ message, intent })` показывает сообщение sonner.
 */
describe('AppToaster поверх sonner', () => {
  it.each([
    ['success', 'success'],
    ['danger', 'error'],
    ['warning', 'warning'],
    ['primary', 'info'],
  ])('окраска %s → toast.%s', (intent, method) => {
    AppToaster.show({ message: 'Сохранено', intent });
    expect(toast[method]).toHaveBeenCalledWith('Сохранено', expect.objectContaining({ duration: 5000 }));
  });

  it('без окраски — обычное сообщение', () => {
    AppToaster.show({ message: 'Готово' });
    expect(toast).toHaveBeenCalledWith('Готово', expect.any(Object));
  });

  it('timeout: 0 — висит, пока не закроют', () => {
    AppToaster.show({ message: 'Загрузка', timeout: 0 });
    expect(toast).toHaveBeenCalledWith('Загрузка', expect.objectContaining({ duration: Infinity }));
  });

  it('с ключом — обновляет то же сообщение, ключ возвращается', () => {
    const key = AppToaster.show({ message: '10 %' });
    AppToaster.show({ message: '50 %' }, key);
    expect(toast.mock.calls[1][1].id).toBe(key);
  });

  it('onDismiss различает «сам по таймеру» и «закрыли»', () => {
    const onDismiss = vi.fn();
    AppToaster.show({ message: 'x', onDismiss });
    const options = toast.mock.calls[0][1];
    options.onAutoClose();
    options.onDismiss();
    expect(onDismiss.mock.calls).toEqual([[true], [false]]);
  });

  it('действие переносится кнопкой', () => {
    const onClick = vi.fn();
    AppToaster.show({ message: 'Удалено', action: { text: 'Отменить', onClick } });
    const action = toast.mock.calls[0][1].action;
    expect(action.label).toBe('Отменить');
    action.onClick();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('dismiss закрывает по ключу', () => {
    AppToaster.dismiss('k1');
    expect(toast.dismiss).toHaveBeenCalledWith('k1');
  });
});

describe('показчик уведомлений — ровно один', () => {
  // Два показчика sonner рисуют каждое сообщение дважды; ни одного — и
  // сообщения пропадают. Показчик живёт в корне приложения.
  const SRC = path.resolve(__dirname, '../..');
  const files = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : files(full);
      return entry.name.endsWith('.tsx') && !/\.(spec|test|stories)\./.test(entry.name) ? [full] : [];
    });

  it('<Toaster /> монтируется только в App.tsx', () => {
    const mounts = files(SRC)
      .filter((file) => /<Toaster\b/.test(activeCode(fs.readFileSync(file, 'utf8'))))
      .map((file) => path.relative(SRC, file).split(path.sep).join('/'));

    expect(mounts).toEqual(['components/App.tsx']);
  });
});
