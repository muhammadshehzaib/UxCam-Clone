/**
 * DOM Recorder — captures DOM mutations incrementally using MutationObserver.
 *
 * Batches mutations every FLUSH_INTERVAL_MS so the payload is small.
 * On each page navigation a new full snapshot is taken automatically.
 */

import {
  DOMSnapshot,
  DOMMutation,
  SerializedNode,
  takeSnapshot,
  serializeNode,
  assignIds,
  getNodeId,
  getMaskedInputValue,
} from './domSerializer';

type PushFn = (snapshot: DOMSnapshot | DOMMutation) => void;

const FLUSH_INTERVAL_MS = 200; // batch mutations every 200ms
const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024; // 2 MB guard

// ── Pending mutation buffers ───────────────────────────────────────────────────

let _adds:    DOMMutation['adds']    = [];
let _removes: DOMMutation['removes'] = [];
let _attrs:   DOMMutation['attrs']   = [];
let _texts:   DOMMutation['texts']   = [];
let _scrolls: DOMMutation['scrolls'] = [];
let _inputs:  DOMMutation['inputs']  = [];

function resetBuffers() {
  _adds = []; _removes = []; _attrs = []; _texts = []; _scrolls = []; _inputs = [];
}

function hasBufferedData(): boolean {
  return (
    _adds.length > 0 || _removes.length > 0 || _attrs.length > 0 ||
    _texts.length > 0 || _scrolls.length > 0 || _inputs.length > 0
  );
}

// ── Mutation processing ────────────────────────────────────────────────────────

function processMutation(record: MutationRecord): void {
  switch (record.type) {
    case 'childList': {
      const parentId = getNodeId(record.target);

      record.removedNodes.forEach((node) => {
        _removes.push({ parentId, id: getNodeId(node) });
      });

      record.addedNodes.forEach((node) => {
        assignIds(node);
        const serialized = serializeNode(node);
        if (!serialized) return;
        const nextSibling = record.nextSibling;
        _adds.push({
          parentId,
          nextSiblingId: nextSibling ? getNodeId(nextSibling) : null,
          node: serialized,
        });
      });
      break;
    }

    case 'attributes': {
      const el = record.target as Element;
      const attr = record.attributeName!;
      if (/^on/i.test(attr)) break; // skip event handler attrs
      _attrs.push({
        id:    getNodeId(el),
        attr,
        value: el.getAttribute(attr),
      });
      break;
    }

    case 'characterData': {
      _texts.push({
        id:    getNodeId(record.target),
        value: record.target.textContent ?? '',
      });
      break;
    }
  }
}

// ── Scroll tracking ────────────────────────────────────────────────────────────

function onScroll(e: Event): void {
  const target = e.target as Element | Document;
  const node   = target === document ? document.documentElement : target as Element;
  _scrolls.push({
    id: getNodeId(node),
    x:  (node as Element).scrollLeft ?? window.scrollX,
    y:  (node as Element).scrollTop  ?? window.scrollY,
  });
}

// ── Input tracking ─────────────────────────────────────────────────────────────

function onInput(e: Event): void {
  const el = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (!el || !('value' in el)) return;
  _inputs.push({
    id:    getNodeId(el),
    value: getMaskedInputValue(el),
  });
}

// ── Main attachment function ───────────────────────────────────────────────────

/**
 * Start recording DOM mutations.
 *
 * @param push   Function that receives snapshots/mutations to send to backend
 * @param getElapsedMs  Returns ms since session start
 * @returns Cleanup function
 */
export function attachDOMRecorder(
  push:         PushFn,
  getElapsedMs: () => number
): () => void {
  // 1. Take initial full snapshot
  const initialSnapshot = takeSnapshot(getElapsedMs());
  const snapshotJson    = JSON.stringify(initialSnapshot);

  if (snapshotJson.length <= MAX_SNAPSHOT_BYTES) {
    push(initialSnapshot);
  } else {
    console.warn('[UXClone] DOM snapshot too large — skipping');
  }

  resetBuffers();

  // 2. Observe mutations
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      processMutation(record);
    }
  });

  observer.observe(document.documentElement, {
    childList:             true,
    subtree:               true,
    attributes:            true,
    attributeOldValue:     false,
    characterData:         true,
    characterDataOldValue: false,
  });

  // 3. Observe scroll on any element
  document.addEventListener('scroll', onScroll, { passive: true, capture: true });

  // 4. Observe input values
  document.addEventListener('input', onInput, { passive: true, capture: true });

  // 5. Flush timer — emit buffered mutations every FLUSH_INTERVAL_MS
  const flushTimer = setInterval(() => {
    if (!hasBufferedData()) return;

    const mutation: DOMMutation = {
      type:      'mutation',
      elapsedMs: getElapsedMs(),
      adds:      _adds,
      removes:   _removes,
      attrs:     _attrs,
      texts:     _texts,
      scrolls:   _scrolls,
      inputs:    _inputs,
    };

    resetBuffers();
    push(mutation);
  }, FLUSH_INTERVAL_MS);

  // 6. Re-snapshot on SPA navigation
  const originalPushState = history.pushState.bind(history);
  history.pushState = function (...args) {
    originalPushState(...args);
    const snap = takeSnapshot(getElapsedMs());
    push(snap);
    resetBuffers();
  };

  // 7. Cleanup
  return () => {
    observer.disconnect();
    clearInterval(flushTimer);
    document.removeEventListener('scroll', onScroll, { capture: true });
    document.removeEventListener('input',  onInput,  { capture: true });
    history.pushState = originalPushState;
    resetBuffers();
  };
}
