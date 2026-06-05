import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import { createElement, type AnchorHTMLAttributes, type ReactNode } from 'react';

const reactActWarningPattern = /not wrapped in act/i;
const allowedConsoleMessages: RegExp[] = [];
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

type MockLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string | { pathname?: string; query?: Record<string, boolean | number | string | null | undefined>; hash?: string };
  children: ReactNode;
};

function normalizeMockHref(href: MockLinkProps['href']) {
  if (typeof href === 'string') return href;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(href.query ?? {})) {
    if (value !== null && value !== undefined) query.set(key, String(value));
  }
  const queryString = query.toString();
  const hash = href.hash ? (href.hash.startsWith('#') ? href.hash : `#${href.hash}`) : '';
  return `${href.pathname ?? '#'}${queryString ? `?${queryString}` : ''}${hash}`;
}

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: MockLinkProps) => {
    const normalizedHref = normalizeMockHref(href);
    return createElement('a', { href: normalizedHref, ...props }, children);
  },
}));

function messageText(args: unknown[]) {
  return args.map((arg) => String(arg)).join(' ');
}

function unexpectedActWarnings(calls: unknown[][]) {
  return calls
    .map(messageText)
    .filter((message) => reactActWarningPattern.test(message))
    .filter((message) => !allowedConsoleMessages.some((pattern) => pattern.test(message)));
}

export function allowConsoleMessageForTest(pattern: RegExp) {
  allowedConsoleMessages.push(pattern);
}

beforeEach(() => {
  allowedConsoleMessages.length = 0;
  const originalConsoleError = console.error.bind(console);
  const originalConsoleWarn = console.warn.bind(console);
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = messageText(args);
    if (reactActWarningPattern.test(message) && !allowedConsoleMessages.some((pattern) => pattern.test(message))) return;
    originalConsoleError(...args);
  });
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    const message = messageText(args);
    if (reactActWarningPattern.test(message) && !allowedConsoleMessages.some((pattern) => pattern.test(message))) return;
    originalConsoleWarn(...args);
  });
});

afterEach(() => {
  const actWarnings = [
    ...unexpectedActWarnings(consoleErrorSpy.mock.calls),
    ...unexpectedActWarnings(consoleWarnSpy.mock.calls),
  ];

  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();

  expect(actWarnings, `Unexpected React act warning(s):\n${actWarnings.join('\n---\n')}`).toEqual([]);
});
