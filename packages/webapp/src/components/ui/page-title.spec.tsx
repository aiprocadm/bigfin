import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

import { PageTitle, PageTitleProvider, usePageTitleState } from './page-title';
import { RouteTitle } from '@/components/Dashboard/RouteTitle';

/**
 * Крупный заголовок (UI-045-1 ТЗ-4): один на экран, при прокрутке — в шапку.
 */
type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let observers: { callback: Callback; element?: Element }[] = [];

beforeEach(() => {
  observers = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private entry: { callback: Callback; element?: Element };
      constructor(callback: Callback) {
        this.entry = { callback };
        observers.push(this.entry);
      }
      observe(element: Element) {
        this.entry.element = element;
      }
      disconnect() {}
      unobserve() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

/** Что показала бы шапка. */
function Topbar() {
  const { collapsed } = usePageTitleState();
  return <div data-testid="topbar">{collapsed ?? ''}</div>;
}

const scroll = (visible: boolean) =>
  act(() => {
    observers.forEach(({ callback }) =>
      callback([
        {
          isIntersecting: visible,
          boundingClientRect: { bottom: visible ? 80 : -10 } as DOMRectReadOnly,
          rootBounds: { top: 0 } as DOMRectReadOnly,
        },
      ]),
    );
  });

describe('крупный заголовок страницы', () => {
  it('экран без своего заголовка получает его от маршрута', () => {
    render(
      <PageTitleProvider>
        <RouteTitle title="Налоговые ставки" />
        <p>старый экран</p>
      </PageTitleProvider>,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Налоговые ставки');
  });

  it('экран со своим заголовком — заголовок маршрута уступает: он один', () => {
    render(
      <PageTitleProvider>
        <RouteTitle title="Долги" />
        <PageTitle>Долги</PageTitle>
      </PageTitleProvider>,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('пока заголовок виден, шапка пустая; ушёл вверх — переезжает в шапку', () => {
    render(
      <PageTitleProvider>
        <Topbar />
        <PageTitle>Операции</PageTitle>
      </PageTitleProvider>,
    );
    scroll(true);
    expect(screen.getByTestId('topbar')).toHaveTextContent('');
    scroll(false);
    expect(screen.getByTestId('topbar')).toHaveTextContent('Операции');
    scroll(true);
    expect(screen.getByTestId('topbar')).toHaveTextContent('');
  });

  it('заголовок ниже края (не долистали) в шапку не переезжает', () => {
    render(
      <PageTitleProvider>
        <Topbar />
        <PageTitle>Отчёты</PageTitle>
      </PageTitleProvider>,
    );
    act(() => {
      observers[0].callback([
        {
          isIntersecting: false,
          boundingClientRect: { bottom: 2000 } as DOMRectReadOnly,
          rootBounds: { top: 0 } as DOMRectReadOnly,
        },
      ]);
    });
    expect(screen.getByTestId('topbar')).toHaveTextContent('');
  });

  it('ушёл со страницы — шапка очищается', () => {
    const { rerender } = render(
      <PageTitleProvider>
        <Topbar />
        <PageTitle>Сделки</PageTitle>
      </PageTitleProvider>,
    );
    scroll(false);
    rerender(
      <PageTitleProvider>
        <Topbar />
      </PageTitleProvider>,
    );
    expect(screen.getByTestId('topbar')).toHaveTextContent('');
  });
});
