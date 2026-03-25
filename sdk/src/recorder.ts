import { SDKEvent, EventType } from './types';

type EventQueueFn = (event: SDKEvent) => void;

// CSS selectors that may contain PII — never capture value from these
const PII_INPUT_TYPES = new Set(['password', 'tel', 'email', 'credit-card', 'cc-number']);
const PII_AUTOCOMPLETE = /cc-|cardnumber|cvc/i;

function sanitizeSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  let depth = 0;

  while (current && depth < 3) {
    if (!current.tagName) break;
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (classes) selector += `.${classes}`;
    }
    parts.unshift(selector);
    current = current.parentElement;
    depth++;
  }

  return parts.join(' > ');
}

function normalizeCoord(value: number, max: number): number {
  return Math.round((value / max) * 10000) / 10000; // 4 decimal places
}

let scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function attachRecorder(
  push: EventQueueFn,
  getElapsedMs: () => number,
  getCurrentScreen: () => string
): () => void {
  const handlers: Array<[string, EventListener]> = [];

  function on(type: string, handler: EventListener): void {
    document.addEventListener(type, handler, { passive: true, capture: true });
    handlers.push([type, handler]);
  }

  // Click events
  on('click', (e: Event) => {
    const ev = e as MouseEvent;
    const target = ev.target as Element | null;

    push({
      type: 'click' as EventType,
      timestamp: Date.now(),
      elapsedMs: getElapsedMs(),
      x: normalizeCoord(ev.clientX, window.innerWidth),
      y: normalizeCoord(ev.clientY, window.innerHeight),
      target: target ? sanitizeSelector(target) : undefined,
      screenName: getCurrentScreen(),
    });
  });

  // Scroll events (debounced to max 1 per 300ms)
  on('scroll', () => {
    if (scrollDebounceTimer) return;
    scrollDebounceTimer = setTimeout(() => {
      scrollDebounceTimer = null;
      push({
        type: 'scroll' as EventType,
        timestamp: Date.now(),
        elapsedMs: getElapsedMs(),
        value: String(Math.round(window.scrollY)),
        screenName: getCurrentScreen(),
      });
    }, 300);
  });

  // Input/change events — capture selector and value length only, never the value itself
  on('change', (e: Event) => {
    const target = e.target as HTMLInputElement | null;
    if (!target) return;

    const inputType = target.type?.toLowerCase() ?? '';
    const autocomplete = target.autocomplete?.toLowerCase() ?? '';

    if (PII_INPUT_TYPES.has(inputType) || PII_AUTOCOMPLETE.test(autocomplete)) {
      return; // Skip PII fields entirely
    }

    push({
      type: 'input' as EventType,
      timestamp: Date.now(),
      elapsedMs: getElapsedMs(),
      target: sanitizeSelector(target),
      value: String(target.value?.length ?? 0), // length only, not value
      screenName: getCurrentScreen(),
    });
  });

  // Navigation events (SPA route changes)
  const navHandler = () => {
    push({
      type: 'navigate' as EventType,
      timestamp: Date.now(),
      elapsedMs: getElapsedMs(),
      screenName: window.location.pathname,
      value: window.location.pathname,
    });
  };

  window.addEventListener('popstate', navHandler);
  window.addEventListener('hashchange', navHandler);

  // Intercept history.pushState for SPA frameworks
  const originalPushState = history.pushState.bind(history);
  history.pushState = function (...args) {
    originalPushState(...args);
    navHandler();
  };

  return () => {
    // Cleanup
    for (const [type, handler] of handlers) {
      document.removeEventListener(type, handler, { capture: true });
    }
    window.removeEventListener('popstate', navHandler);
    window.removeEventListener('hashchange', navHandler);
    history.pushState = originalPushState;
  };
}
