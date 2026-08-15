// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useInfiniteScrollSentinel } from './useInfiniteScrollSentinel';

type Callback = (entries: { isIntersecting: boolean }[]) => void;

/** Observers vivos, para simular a mano que el centinela entra en viewport. */
let observers: { callback: Callback; disconnected: boolean }[];

class FakeIntersectionObserver {
  private entry: { callback: Callback; disconnected: boolean };

  constructor(callback: Callback) {
    this.entry = { callback, disconnected: false };
    observers.push(this.entry);
  }

  observe() {}
  unobserve() {}
  disconnect() {
    this.entry.disconnected = true;
  }
}

function scrollSentinelIntoView() {
  act(() => {
    for (const observer of observers) {
      if (!observer.disconnected) observer.callback([{ isIntersecting: true }]);
    }
  });
}

function Harness(props: { hasNextPage: boolean; isFetching: boolean; onIntersect: () => void }) {
  const ref = useInfiniteScrollSentinel(props);
  return <div data-testid="sentinel" ref={ref} />;
}

describe('useInfiniteScrollSentinel', () => {
  beforeEach(() => {
    observers = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('pide la página siguiente cuando el centinela entra en viewport', () => {
    const onIntersect = vi.fn();
    render(<Harness hasNextPage isFetching={false} onIntersect={onIntersect} />);

    scrollSentinelIntoView();

    expect(onIntersect).toHaveBeenCalledTimes(1);
  });

  it('no observa nada si ya no quedan páginas', () => {
    const onIntersect = vi.fn();
    render(<Harness hasNextPage={false} isFetching={false} onIntersect={onIntersect} />);

    scrollSentinelIntoView();

    expect(observers).toHaveLength(0);
    expect(onIntersect).not.toHaveBeenCalled();
  });

  it('no dispara un segundo pedido mientras el anterior está en vuelo', () => {
    const onIntersect = vi.fn();
    render(<Harness hasNextPage isFetching onIntersect={onIntersect} />);

    scrollSentinelIntoView();

    expect(onIntersect).not.toHaveBeenCalled();
  });

  it('desconecta el observer al desmontar', () => {
    const { unmount } = render(<Harness hasNextPage isFetching={false} onIntersect={vi.fn()} />);

    expect(observers[0].disconnected).toBe(false);
    unmount();
    expect(observers[0].disconnected).toBe(true);
  });

  it('no rompe si el browser no soporta IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    expect(() =>
      render(<Harness hasNextPage isFetching={false} onIntersect={vi.fn()} />),
    ).not.toThrow();
  });
});
