import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { canPreload, lazyWithPreload } from './lazyWithPreload';
import { preloadRoute } from '@/routes/preloadRoute';

/** Разделение по разделам и предзагрузка (UI-055-3 ТЗ-4). */
describe('экран с предзагрузкой', () => {
  it('один и тот же загрузчик — один и тот же компонент (иначе экран пересоздавался бы)', () => {
    const make = () => lazyWithPreload(() => import('./lazyWithPreload').then(() => ({ default: () => null })));
    expect(make()).toBe(make());
    // Обёртка общего вида (не `import(…)`) не кешируется: разные экраны не слипаются.
    const wrap = (text: string) => () => Promise.resolve({ default: () => <p>{text}</p> });
    expect(lazyWithPreload(wrap('а'))).not.toBe(lazyWithPreload(wrap('б')));
  });

  it('предзагрузка и показ грузят кусок один раз', async () => {
    const loader = vi.fn(() => Promise.resolve({ default: () => <p>экран-два</p> }));
    const Screen = lazyWithPreload(loader);
    await Screen.preload();
    render(
      <React.Suspense fallback={<p>скелет</p>}>
        <Screen />
      </React.Suspense>,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(screen.getByText('экран-два')).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('неудачная загрузка не запоминается — следующая попытка идёт заново', async () => {
    let calls = 0;
    const Screen = lazyWithPreload(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('сеть')) : Promise.resolve({ default: () => null });
    });
    await expect(Screen.preload()).rejects.toThrow('сеть');
    await Screen.preload();
    expect(calls).toBe(2);
  });

  it('адрес находит свой экран так же, как Switch: первый подходящий', () => {
    const first = lazyWithPreload(() => Promise.resolve({ default: () => <p>импорт</p> }));
    const second = lazyWithPreload(() => Promise.resolve({ default: () => <p>счета</p> }));
    const firstSpy = vi.spyOn(first, 'preload');
    const secondSpy = vi.spyOn(second, 'preload');
    const routes = [
      { path: '/accounts/import', component: first },
      { path: '/accounts', component: second },
    ];

    expect(preloadRoute('/accounts?page=2', routes)).toBe(true);
    expect(secondSpy).toHaveBeenCalledTimes(1);
    expect(firstSpy).not.toHaveBeenCalled();
    expect(preloadRoute('/nowhere', routes)).toBe(false);
  });

  it('все экраны панели умеют предзагружаться', async () => {
    const { getDashboardRoutes } = await import('@/routes/dashboard');
    const without = getDashboardRoutes().filter((r) => !canPreload(r.component)).map((r) => r.path);
    expect(without).toEqual([]);
  });
});
