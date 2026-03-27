/**
 * @jest-environment jsdom
 */
import {
  serializeNode,
  assignIds,
  getNodeId,
  _resetIds,
  takeSnapshot,
  getMaskedInputValue,
} from '../domSerializer';

beforeEach(() => _resetIds());

describe('serializeNode — element nodes', () => {
  it('serializes a simple element with tagName', () => {
    const div = document.createElement('div');
    assignIds(div);
    const result = serializeNode(div);
    expect(result?.type).toBe(1);
    expect(result?.tagName).toBe('div');
  });

  it('serializes attributes', () => {
    const a = document.createElement('a');
    a.setAttribute('href', '/home');
    a.setAttribute('class', 'nav-link');
    assignIds(a);
    const result = serializeNode(a);
    expect(result?.attrs?.href).toBe('/home');
    expect(result?.attrs?.class).toBe('nav-link');
  });

  it('assigns stable integer IDs — same node gets same ID', () => {
    const div = document.createElement('div');
    assignIds(div);
    const id1 = getNodeId(div);
    const id2 = getNodeId(div);
    expect(id1).toBe(id2);
    expect(typeof id1).toBe('number');
  });

  it('strips on* event handler attributes', () => {
    const btn = document.createElement('button');
    btn.setAttribute('onclick', 'alert(1)');
    btn.setAttribute('class', 'btn');
    assignIds(btn);
    const result = serializeNode(btn);
    expect(result?.attrs?.onclick).toBeUndefined();
    expect(result?.attrs?.class).toBe('btn');
  });

  it('strips javascript: href', () => {
    const a = document.createElement('a');
    a.setAttribute('href', 'javascript:void(0)');
    assignIds(a);
    const result = serializeNode(a);
    expect(result?.attrs?.href).toBeUndefined();
  });

  it('skips script elements entirely', () => {
    const script = document.createElement('script');
    script.textContent = 'alert("xss")';
    assignIds(script);
    const result = serializeNode(script);
    expect(result).toBeNull();
  });

  it('replaces iframe src with about:blank and marks as masked', () => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', 'https://external.com');
    assignIds(iframe);
    const result = serializeNode(iframe);
    expect(result?.attrs?.src).toBe('about:blank');
    expect(result?.isMasked).toBe(true);
  });

  it('caps attribute values at 1000 chars', () => {
    const div = document.createElement('div');
    div.setAttribute('data-long', 'x'.repeat(1200));
    assignIds(div);
    const result = serializeNode(div);
    expect(result?.attrs?.['data-long']?.length).toBeLessThanOrEqual(1001); // 1000 + ellipsis
  });

  it('marks data-uxclone-mask elements as masked', () => {
    const div = document.createElement('div');
    div.setAttribute('data-uxclone-mask', '');
    div.textContent = 'secret info';
    assignIds(div);
    const result = serializeNode(div);
    expect(result?.isMasked).toBe(true);
  });
});

describe('serializeNode — text and comment nodes', () => {
  it('serializes text nodes with type 3', () => {
    const text = document.createTextNode('Hello world');
    assignIds(text);
    const result = serializeNode(text);
    expect(result?.type).toBe(3);
    expect(result?.textContent).toBe('Hello world');
  });

  it('serializes comment nodes with type 8', () => {
    const comment = document.createComment('a comment');
    assignIds(comment);
    const result = serializeNode(comment);
    expect(result?.type).toBe(8);
  });
});

describe('getMaskedInputValue', () => {
  it('returns *** for password fields', () => {
    const input = document.createElement('input') as HTMLInputElement;
    input.type  = 'password';
    input.value = 'mysecret';
    expect(getMaskedInputValue(input)).toBe('***');
  });

  it('returns char count for safe fields', () => {
    const input = document.createElement('input') as HTMLInputElement;
    input.type  = 'text';
    input.value = 'hello';
    expect(getMaskedInputValue(input)).toBe('[5 chars]');
  });

  it('returns empty string for empty input', () => {
    const input = document.createElement('input') as HTMLInputElement;
    input.type  = 'text';
    input.value = '';
    expect(getMaskedInputValue(input)).toBe('');
  });
});
