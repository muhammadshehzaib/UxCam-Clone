/**
 * DOM Serializer — converts live DOM nodes into a portable JSON representation.
 *
 * Key design decisions:
 *  - Every node gets a stable integer ID stored in a WeakMap (not in the DOM).
 *  - PII fields (passwords, cc, data-uxclone-mask) are masked before serialisation.
 *  - Dangerous attributes (on*, javascript: hrefs) are stripped.
 *  - Attribute values are capped at 1000 chars to bound payload size.
 */

export interface SerializedNode {
  id:           number;
  type:         1 | 3 | 8 | 11; // ELEMENT | TEXT | COMMENT | DOCUMENT_TYPE
  tagName?:     string;
  attrs?:       Record<string, string>;
  children?:    SerializedNode[];
  textContent?: string;
  isMasked?:    boolean;
}

/** The full-page snapshot sent at session start and on navigation. */
export interface DOMSnapshot {
  type:      'snapshot';
  elapsedMs: number;
  node:      SerializedNode;
  scrollX:   number;
  scrollY:   number;
  width:     number;
  height:    number;
  href:      string;
}

/** A single incremental diff — small, sent ~10–30× per second. */
export interface DOMMutation {
  type:      'mutation';
  elapsedMs: number;
  adds:      Array<{ parentId: number; nextSiblingId: number | null; node: SerializedNode }>;
  removes:   Array<{ parentId: number; id: number }>;
  attrs:     Array<{ id: number; attr: string; value: string | null }>;
  texts:     Array<{ id: number; value: string }>;
  scrolls:   Array<{ id: number; x: number; y: number }>;
  inputs:    Array<{ id: number; value: string }>;
}

// ── ID management ─────────────────────────────────────────────────────────────

let _nextId = 1;
const _nodeIds = new WeakMap<Node, number>();

/** Return the stable integer ID for a node, assigning one if needed. */
export function getNodeId(node: Node): number {
  let id = _nodeIds.get(node);
  if (id === undefined) {
    id = _nextId++;
    _nodeIds.set(node, id);
  }
  return id;
}

/** Walk an entire subtree and pre-assign IDs (call before taking a snapshot). */
export function assignIds(root: Node): void {
  getNodeId(root);
  root.childNodes.forEach((child) => assignIds(child));
}

/** Reset ID counter — only call in tests. */
export function _resetIds(): void {
  _nextId = 1;
}

// ── PII detection ─────────────────────────────────────────────────────────────

const PII_INPUT_TYPES   = new Set(['password', 'tel', 'email', 'credit-card', 'cc-number']);
const PII_AUTOCOMPLETE  = /cc-|cardnumber|cvc/i;
const DANGEROUS_ATTR    = /^on/i;
const MAX_ATTR_LENGTH   = 1000;

function isSensitiveInput(el: Element): boolean {
  const tag  = el.tagName?.toLowerCase();
  if (tag !== 'input' && tag !== 'textarea') return false;
  const type = (el as HTMLInputElement).type?.toLowerCase() ?? '';
  const auto = (el as HTMLInputElement).autocomplete?.toLowerCase() ?? '';
  return (
    PII_INPUT_TYPES.has(type) ||
    PII_AUTOCOMPLETE.test(auto) ||
    el.hasAttribute('data-uxclone-mask')
  );
}

function hasMaskAttr(el: Element): boolean {
  return el.hasAttribute('data-uxclone-mask');
}

// ── Attribute sanitisation ────────────────────────────────────────────────────

function sanitizeAttrs(el: Element): Record<string, string> {
  const result: Record<string, string> = {};
  const baseUrl = window.location.origin;

  for (const { name, value } of Array.from(el.attributes)) {
    if (DANGEROUS_ATTR.test(name)) continue; // strip event handlers
    if (name === 'href' && value.trimStart().startsWith('javascript:')) continue;

    let finalValue = value;

    // Resolve relative URLs to absolute so they load correctly in the dashboard
    if (name === 'src' || name === 'href' || name === 'poster') {
      if (value && !value.startsWith('http') && !value.startsWith('//') && !value.startsWith('data:')) {
        try {
          finalValue = new URL(value, window.location.href).href;
        } catch {
          /* fallback to original */
        }
      }
    }

    result[name] = finalValue.length > MAX_ATTR_LENGTH
      ? finalValue.slice(0, MAX_ATTR_LENGTH) + '…'
      : finalValue;
  }
  return result;
}

// ── Main serializer ───────────────────────────────────────────────────────────

/**
 * Recursively serialize a DOM node.
 * Returns null for nodes we deliberately skip (e.g. script, style).
 */
export function serializeNode(node: Node): SerializedNode | null {
  const id = getNodeId(node);

  switch (node.nodeType) {
    case Node.DOCUMENT_TYPE_NODE: {
      const dt = node as DocumentType;
      return { id, type: 11, tagName: dt.name };
    }

    case Node.TEXT_NODE: {
      const text = node.textContent ?? '';
      // Skip whitespace-only text nodes inside head/script/style
      const parent = node.parentElement;
      if (parent) {
        const tag = parent.tagName.toLowerCase();
        if (tag === 'script') return null; // Skip scripts
        // We DO capture text inside <style> tags (the CSS content)
      }
      return { id, type: 3, textContent: text };
    }

    case Node.COMMENT_NODE: {
      return { id, type: 8, textContent: node.textContent ?? '' };
    }

    case Node.ELEMENT_NODE: {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      // Skip script tags entirely (no replay value, security risk)
      if (tag === 'script') return null;

      const isMasked   = hasMaskAttr(el);
      const isSensitive = isSensitiveInput(el);
      const attrs      = sanitizeAttrs(el);

      // Replace src/href for iframes to prevent cross-origin issues
      if (tag === 'iframe') {
        return {
          id, type: 1, tagName: tag,
          attrs: { ...attrs, src: 'about:blank', 'data-uxclone-blocked': 'iframe' },
          children: [],
          isMasked: true,
        };
      }

      const children: SerializedNode[] = [];
      if (!isMasked && !isSensitive) {
        el.childNodes.forEach((child) => {
          const serialized = serializeNode(child);
          if (serialized) children.push(serialized);
        });
      }

      return {
        id,
        type: 1,
        tagName: tag,
        attrs,
        children,
        ...(isMasked || isSensitive ? { isMasked: true } : {}),
      };
    }

    default:
      return null;
  }
}

/**
 * Serialize the current document into a full DOMSnapshot.
 */
export function takeSnapshot(elapsedMs: number): DOMSnapshot {
  assignIds(document);
  const node = serializeNode(document.documentElement);

  return {
    type:      'snapshot',
    elapsedMs,
    node:      node!,
    scrollX:   window.scrollX,
    scrollY:   window.scrollY,
    width:     window.innerWidth,
    height:    window.innerHeight,
    href:      window.location.href,
  };
}

/**
 * Get the masked display value for an input (never log actual value).
 */
export function getMaskedInputValue(el: HTMLInputElement | HTMLTextAreaElement): string {
  if (isSensitiveInput(el)) return '***';
  return el.value || '';
}
