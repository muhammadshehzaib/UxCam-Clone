export interface ScreenFramePayload {
  elapsedMs: number;
  data:      string;   // base64 JPEG
  width:     number;
  height:    number;
}

type SendFrameFn = (frame: ScreenFramePayload) => void;

const DEFAULT_INTERVAL_MS = 1000;   // capture ~1 fps — enough for replay, light on bandwidth
const JPEG_QUALITY        = 0.5;
const MAX_CAPTURE_WIDTH   = 720;    // downscale so frames stay well under the 1MB cap

/**
 * Periodically captures the device screen and forwards each frame.
 *
 * Requires the optional peer dependency `react-native-view-shot`. If it isn't
 * installed, screen recording is silently disabled (events/touches still work).
 *
 * @returns a detach function that stops capturing.
 */
export function attachRNScreenRecorder(
  sendFrame:    SendFrameFn,
  getElapsedMs: () => number,
  intervalMs:   number = DEFAULT_INTERVAL_MS
): () => void {
  let captureScreen: ((opts: Record<string, unknown>) => Promise<string>) | null = null;
  let screenW = 0;
  let screenH = 0;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const viewShot = require('react-native-view-shot');
    captureScreen = viewShot.captureScreen ?? null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Dimensions } = require('react-native');
    const d = Dimensions.get('screen');
    screenW = d.width;
    screenH = d.height;
  } catch {
    // react-native-view-shot not installed — disable screen recording gracefully
    captureScreen = null;
  }

  if (!captureScreen) {
    return () => { /* no-op: screen recording unavailable */ };
  }

  let stopped = false;

  const tick = async (): Promise<void> => {
    if (stopped || !captureScreen) return;
    try {
      const base64 = await captureScreen({
        format:  'jpg',
        quality: JPEG_QUALITY,
        result:  'base64',
        width:   Math.min(screenW, MAX_CAPTURE_WIDTH),
      });
      if (base64 && !stopped) {
        sendFrame({ elapsedMs: getElapsedMs(), data: base64, width: screenW, height: screenH });
      }
    } catch {
      /* a single failed capture is non-fatal — keep going */
    }
  };

  // Fire one immediately so the replay has a frame from t≈0, then on an interval.
  void tick();
  const timer = setInterval(tick, intervalMs);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
