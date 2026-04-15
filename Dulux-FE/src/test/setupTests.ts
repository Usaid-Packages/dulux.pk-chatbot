import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import '@testing-library/jest-dom/vitest';

class ResizeObserverMock implements ResizeObserver {
  public readonly observedElements = new Set<Element>();

  public disconnect(): void {
    this.observedElements.clear();
  }

  public observe(target: Element): void {
    this.observedElements.add(target);
  }

  public unobserve(target: Element): void {
    this.observedElements.delete(target);
  }
}

afterEach(() => {
  cleanup();
});

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string): MediaQueryList => {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }),
});
