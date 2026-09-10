import { expect, type Page, type Route } from '@playwright/test';

export interface RequestGate {
  /** How many matching requests are currently parked. */
  readonly held: number;
  /** How many matching requests have been seen in total. */
  readonly total: number;
  /** Blocks until at least `count` requests are parked. */
  waitUntilHeld(count?: number): Promise<void>;
  /** Lets every parked request through. */
  release(): void;
  /** Stops intercepting; anything still parked is released first. */
  dispose(): Promise<void>;
}

/**
 * Parks matching requests until the test explicitly releases them. This is how
 * the loading-state and race-condition specs stay deterministic: nothing here
 * depends on a timer, so there is no sleep to tune and nothing to go flaky
 * on a slow machine.
 */
export async function holdRequests(
  page: Page,
  matches: (route: Route) => boolean,
): Promise<RequestGate> {
  const parked: Array<() => void> = [];
  let total = 0;

  const handler = async (route: Route) => {
    if (!matches(route)) {
      await route.continue();
      return;
    }
    total += 1;
    await new Promise<void>((resolve) => parked.push(resolve));
    await route.continue();
  };

  await page.route('**/*', handler);

  return {
    get held() {
      return parked.length;
    },
    get total() {
      return total;
    },
    async waitUntilHeld(count = 1) {
      await expect.poll(() => parked.length, { timeout: 10_000 }).toBeGreaterThanOrEqual(count);
    },
    release() {
      for (const resume of parked.splice(0)) resume();
    },
    async dispose() {
      for (const resume of parked.splice(0)) resume();
      await page.unroute('**/*', handler);
    },
  };
}

export const isBookList = (route: Route): boolean => {
  const url = new URL(route.request().url());
  return url.pathname === '/api/books' && route.request().method() === 'GET';
};

export const isBookCreate = (route: Route): boolean => {
  const url = new URL(route.request().url());
  return url.pathname === '/api/books' && route.request().method() === 'POST';
};

export const isCartAdd = (route: Route): boolean => {
  const url = new URL(route.request().url());
  return url.pathname === '/api/cart/items' && route.request().method() === 'POST';
};

/** Counts requests the page issues to a path, for debounce assertions. */
export function countRequests(page: Page, pathname: string, method = 'GET'): () => number {
  let count = 0;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === pathname && request.method() === method) count += 1;
  });
  return () => count;
}
