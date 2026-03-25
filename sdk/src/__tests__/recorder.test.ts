import { attachRecorder } from '../recorder';

describe('recorder', () => {
  let pushed: unknown[];
  let detach: () => void;

  beforeEach(() => {
    pushed = [];
    detach = attachRecorder(
      (ev) => pushed.push(ev),
      () => 1000,
      () => '/home'
    );
  });

  afterEach(() => {
    detach();
  });

  describe('click capture', () => {
    it('pushes a click event with normalized x/y coordinates', () => {
      const clickEvent = new MouseEvent('click', {
        clientX: window.innerWidth * 0.5,
        clientY: window.innerHeight * 0.25,
        bubbles: true,
      });
      document.dispatchEvent(clickEvent);

      expect(pushed).toHaveLength(1);
      const ev = pushed[0] as any;
      expect(ev.type).toBe('click');
      expect(ev.x).toBeCloseTo(0.5, 2);
      expect(ev.y).toBeCloseTo(0.25, 2);
      expect(ev.elapsedMs).toBe(1000);
      expect(ev.screenName).toBe('/home');
    });

    it('includes sanitized target selector', () => {
      const btn = document.createElement('button');
      btn.id = 'submit';
      document.body.appendChild(btn);

      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const ev = pushed[0] as any;
      expect(ev.target).toContain('button');
      document.body.removeChild(btn);
    });
  });

  describe('input capture', () => {
    it('captures input change with value length, not actual value', () => {
      const input = document.createElement('input');
      input.type = 'text';
      Object.defineProperty(input, 'value', { value: 'hello', writable: true });
      document.body.appendChild(input);

      input.dispatchEvent(new Event('change', { bubbles: true }));

      const ev = pushed[0] as any;
      expect(ev.type).toBe('input');
      expect(ev.value).toBe('5'); // length of 'hello'
      expect(ev.value).not.toBe('hello');
      document.body.removeChild(input);
    });

    it('does NOT capture password field values', () => {
      const input = document.createElement('input');
      input.type = 'password';
      document.body.appendChild(input);

      input.dispatchEvent(new Event('change', { bubbles: true }));

      expect(pushed).toHaveLength(0);
      document.body.removeChild(input);
    });

    it('does NOT capture tel field values', () => {
      const input = document.createElement('input');
      input.type = 'tel';
      document.body.appendChild(input);

      input.dispatchEvent(new Event('change', { bubbles: true }));

      expect(pushed).toHaveLength(0);
      document.body.removeChild(input);
    });
  });

  describe('navigation capture', () => {
    it('captures popstate as a navigate event', () => {
      window.dispatchEvent(new PopStateEvent('popstate'));

      const ev = pushed[0] as any;
      expect(ev.type).toBe('navigate');
    });

    it('intercepts history.pushState and fires navigate event', () => {
      history.pushState({}, '', '/new-route');

      const ev = pushed[0] as any;
      expect(ev.type).toBe('navigate');
      expect(ev.value).toBe('/new-route');
    });
  });

  describe('cleanup', () => {
    it('detach() removes all event listeners', () => {
      detach();
      pushed = [];

      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(pushed).toHaveLength(0);
    });
  });
});
