import { SDKEvent } from './types';

type PushFn = (event: SDKEvent) => void;

const FEEDBACK_VALUE = '__feedback__';

/**
 * Records a feedback message as a custom event in the active session.
 * The feedback is attached to the session replay at the current elapsed time.
 */
export function submitFeedback(
  push: PushFn,
  getElapsedMs: () => number,
  getCurrentScreen: () => string,
  message: string,
  rating?: number
): void {
  push({
    type:       'custom',
    timestamp:  Date.now(),
    elapsedMs:  getElapsedMs(),
    screenName: getCurrentScreen(),
    value:      FEEDBACK_VALUE,
    metadata: {
      message:  message.slice(0, 1000),
      ...(rating !== undefined ? { rating } : {}),
      feedback: true,
    },
  });
}

/**
 * Injects a floating feedback button into the page.
 * Clicking it opens a modal with a textarea + optional star rating.
 * Returns a cleanup function that removes the widget from the DOM.
 */
export function attachFeedbackWidget(
  push: PushFn,
  getElapsedMs: () => number,
  getCurrentScreen: () => string,
  options: { position?: 'bottom-right' | 'bottom-left'; label?: string } = {}
): () => void {
  const { position = 'bottom-right', label = 'Feedback' } = options;

  // Floating button
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.setAttribute('data-uxclone-feedback', 'trigger');
  Object.assign(btn.style, {
    position:    'fixed',
    bottom:      '20px',
    [position === 'bottom-right' ? 'right' : 'left']: '20px',
    zIndex:      '9999',
    padding:     '8px 16px',
    background:  '#6366f1',
    color:       '#fff',
    border:      'none',
    borderRadius:'8px',
    fontSize:    '14px',
    cursor:      'pointer',
    boxShadow:   '0 2px 8px rgba(0,0,0,0.2)',
  });

  // Modal overlay
  function openModal() {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-uxclone-feedback', 'overlay');
    Object.assign(overlay.style, {
      position:  'fixed', inset: '0', background: 'rgba(0,0,0,0.4)',
      zIndex:    '10000', display: 'flex', alignItems: 'center', justifyContent: 'center',
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      background: '#fff', borderRadius: '12px', padding: '24px',
      width: '320px', boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
    });

    const title = document.createElement('h3');
    title.textContent = 'Share your feedback';
    Object.assign(title.style, { margin: '0 0 12px', fontSize: '16px', fontWeight: '600' });

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'What's on your mind?';
    textarea.setAttribute('data-uxclone-feedback', 'textarea');
    Object.assign(textarea.style, {
      width: '100%', height: '100px', padding: '8px', border: '1px solid #e2e8f0',
      borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box',
    });

    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit';
    Object.assign(submitBtn.style, {
      marginTop: '12px', width: '100%', padding: '8px',
      background: '#6366f1', color: '#fff', border: 'none',
      borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      position: 'absolute', top: '12px', right: '12px',
      background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#94a3b8',
    });
    card.style.position = 'relative';

    submitBtn.addEventListener('click', () => {
      const msg = textarea.value.trim();
      if (msg) {
        submitFeedback(push, getElapsedMs, getCurrentScreen, msg);
        document.body.removeChild(overlay);
      }
    });

    const close = () => document.body.removeChild(overlay);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    card.append(title, closeBtn, textarea, submitBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    setTimeout(() => textarea.focus(), 50);
  }

  btn.addEventListener('click', openModal);
  document.body.appendChild(btn);

  return () => {
    if (btn.parentNode) btn.parentNode.removeChild(btn);
    const overlay = document.querySelector('[data-uxclone-feedback="overlay"]');
    if (overlay) overlay.parentNode?.removeChild(overlay);
  };
}
