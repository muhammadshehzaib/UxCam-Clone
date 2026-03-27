'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Types (mirror sdk/src/domSerializer.ts) ───────────────────────────────────

interface SerializedNode {
  id:           number;
  type:         1 | 3 | 8 | 11;
  tagName?:     string;
  attrs?:       Record<string, string>;
  children?:    SerializedNode[];
  textContent?: string;
  isMasked?:    boolean;
}

interface DOMSnapshot {
  type:      'snapshot';
  elapsedMs: number;
  node:      SerializedNode;
  scrollX:   number;
  scrollY:   number;
  width:     number;
  height:    number;
  href:      string;
}

interface DOMMutation {
  type:      'mutation';
  elapsedMs: number;
  adds:      Array<{ parentId: number; nextSiblingId: number | null; node: SerializedNode }>;
  removes:   Array<{ parentId: number; id: number }>;
  attrs:     Array<{ id: number; attr: string; value: string | null }>;
  texts:     Array<{ id: number; value: string }>;
  scrolls:   Array<{ id: number; x: number; y: number }>;
  inputs:    Array<{ id: number; value: string }>;
}

type DOMFrame = { data: string; elapsed_ms: number; type: string };

// ── DOM reconstruction ────────────────────────────────────────────────────────

function buildNode(
  sNode: SerializedNode,
  doc:   Document,
  idMap: Map<number, Node>
): Node | null {
  let node: Node;

  switch (sNode.type) {
    case 11: // DOCUMENT_TYPE
      node = doc.createDocumentFragment(); // placeholder
      break;
    case 3:  // TEXT
      node = doc.createTextNode(sNode.textContent ?? '');
      break;
    case 8:  // COMMENT
      node = doc.createComment(sNode.textContent ?? '');
      break;
    case 1: { // ELEMENT
      const tag = sNode.tagName ?? 'div';
      try { node = doc.createElement(tag); } catch { node = doc.createElement('div'); }
      const el = node as Element;

      if (sNode.attrs) {
        for (const [k, v] of Object.entries(sNode.attrs)) {
          try { el.setAttribute(k, v); } catch { /* skip invalid attrs */ }
        }
      }

      if (sNode.isMasked) {
        el.innerHTML = '<span style="background:#e2e8f0;color:#94a3b8;padding:2px 6px;border-radius:4px;font-size:12px;">🔒 masked</span>';
      } else if (sNode.children) {
        for (const child of sNode.children) {
          const childNode = buildNode(child, doc, idMap);
          if (childNode) el.appendChild(childNode);
        }
      }
      break;
    }
    default:
      return null;
  }

  idMap.set(sNode.id, node);
  return node;
}

function applySnapshot(iframe: HTMLIFrameElement, snap: DOMSnapshot, idMap: Map<number, Node>) {
  const doc = iframe.contentDocument;
  if (!doc) return;
  idMap.clear();

  // Build the root element
  const rootEl = buildNode(snap.node, doc, idMap);
  if (!rootEl) return;

  doc.open();
  doc.write('<!DOCTYPE html>');
  doc.close();

  // Replace html element
  const existingHtml = doc.documentElement;
  if (existingHtml && rootEl !== existingHtml) {
    doc.replaceChild(rootEl, existingHtml);
  }

  // Restore scroll
  doc.documentElement.scrollLeft = snap.scrollX;
  doc.documentElement.scrollTop  = snap.scrollY;
}

function applyMutation(iframe: HTMLIFrameElement, mut: DOMMutation, idMap: Map<number, Node>) {
  const doc = iframe.contentDocument;
  if (!doc) return;

  // Removals
  for (const { parentId, id } of mut.removes) {
    const parent = idMap.get(parentId);
    const child  = idMap.get(id);
    if (parent && child && parent.contains(child)) {
      parent.removeChild(child);
    }
    idMap.delete(id);
  }

  // Additions
  for (const { parentId, nextSiblingId, node: sNode } of mut.adds) {
    const parent = idMap.get(parentId);
    if (!parent) continue;
    const newNode   = buildNode(sNode, doc, idMap);
    if (!newNode) continue;
    const nextSibling = nextSiblingId ? idMap.get(nextSiblingId) ?? null : null;
    parent.insertBefore(newNode, nextSibling as ChildNode | null);
  }

  // Attribute changes
  for (const { id, attr, value } of mut.attrs) {
    const el = idMap.get(id) as Element | undefined;
    if (!el || el.nodeType !== 1) continue;
    if (value === null) { el.removeAttribute(attr); }
    else                { try { el.setAttribute(attr, value); } catch { /* skip */ } }
  }

  // Text changes
  for (const { id, value } of mut.texts) {
    const node = idMap.get(id);
    if (node) node.textContent = value;
  }

  // Input values
  for (const { id, value } of mut.inputs) {
    const el = idMap.get(id) as HTMLInputElement | undefined;
    if (el && 'value' in el) (el as HTMLInputElement).value = value;
  }

  // Scrolls
  for (const { id, x, y } of mut.scrolls) {
    const el = idMap.get(id) as Element | undefined;
    if (el) { el.scrollLeft = x; el.scrollTop = y; }
  }
}

// ── Main component ────────────────────────────────────────────────────────────

interface DOMReplayViewerProps {
  frames:       DOMFrame[];
  currentTimeMs: number;
  width?:       number;
}

export default function DOMReplayViewer({
  frames,
  currentTimeMs,
  width = 390,
}: DOMReplayViewerProps) {
  const iframeRef      = useRef<HTMLIFrameElement>(null);
  const idMapRef       = useRef<Map<number, Node>>(new Map());
  const lastFrameRef   = useRef<number>(-1);

  // Parse all frames once
  const parsedFrames = useRef<Array<DOMSnapshot | DOMMutation>>([]);

  useEffect(() => {
    parsedFrames.current = frames.map((f) => {
      try {
        const parsed = JSON.parse(f.data);
        return { ...parsed, elapsedMs: f.elapsed_ms };
      } catch {
        return null;
      }
    }).filter(Boolean) as Array<DOMSnapshot | DOMMutation>;
    lastFrameRef.current = -1;
  }, [frames]);

  // Apply frames up to currentTimeMs
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const allFrames  = parsedFrames.current;
    if (!allFrames.length) return;

    // Find how many frames we need to apply
    let targetIdx = -1;
    for (let i = 0; i < allFrames.length; i++) {
      if (allFrames[i].elapsedMs <= currentTimeMs) targetIdx = i;
      else break;
    }

    if (targetIdx < 0) return;

    // If we seeked backwards or haven't started, rebuild from last snapshot
    const lastApplied = lastFrameRef.current;
    let startIdx = lastApplied + 1;

    if (targetIdx < lastApplied) {
      // Seeked backward — find the latest snapshot at or before targetIdx
      let snapshotIdx = -1;
      for (let i = targetIdx; i >= 0; i--) {
        if (allFrames[i].type === 'snapshot') { snapshotIdx = i; break; }
      }
      if (snapshotIdx < 0) return;
      applySnapshot(iframe, allFrames[snapshotIdx] as DOMSnapshot, idMapRef.current);
      startIdx = snapshotIdx + 1;
    }

    // Apply frames from startIdx to targetIdx
    for (let i = startIdx; i <= targetIdx; i++) {
      const frame = allFrames[i];
      if (frame.type === 'snapshot') {
        applySnapshot(iframe, frame as DOMSnapshot, idMapRef.current);
      } else if (frame.type === 'mutation') {
        applyMutation(iframe, frame as DOMMutation, idMapRef.current);
      }
    }

    lastFrameRef.current = targetIdx;
  }, [currentTimeMs]);

  if (!frames.length) {
    return (
      <div
        className="flex items-center justify-center bg-slate-100 rounded-2xl border-4 border-slate-700"
        style={{ width, height: Math.round(width * 16 / 9) }}
        data-testid="dom-replay-empty"
      >
        <p className="text-slate-400 text-sm text-center px-4">
          No DOM recording available for this session
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl border-4 border-slate-700 overflow-hidden shadow-xl bg-white"
      style={{ width }}
      data-testid="dom-replay-viewer"
    >
      <iframe
        ref={iframeRef}
        title="Session replay"
        sandbox="allow-same-origin allow-scripts"
        style={{ width: '100%', height: Math.round(width * 16 / 9), border: 'none', display: 'block' }}
        data-testid="replay-iframe"
      />
      {/* UXClone overlay — prevent user interaction with the iframe */}
      <div className="absolute inset-0 pointer-events-none" />
    </div>
  );
}
