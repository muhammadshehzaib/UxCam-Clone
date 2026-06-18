import { RNEvent } from './types';

type PushFn = (event: RNEvent) => void;

interface GestureResponderEventLike {
  nativeEvent: { pageX: number; pageY: number };
}

/**
 * Builds props to spread onto your app's root View so every tap is recorded
 * automatically (normalized 0–1), without stealing the touch from your UI:
 *
 *   <View style={{ flex: 1 }} {...UXCloneRN.touchHandlers()}>
 *     ...your app...
 *   </View>
 *
 * It uses `onStartShouldSetResponderCapture`, which fires on the capture phase
 * for every touch start on the root, and returns `false` so it never becomes
 * the responder — your buttons and gestures keep working untouched.
 */
export function createTouchHandlers(
  push: PushFn,
  getElapsedMs: () => number,
  getCurrentScreen: () => string
): { onStartShouldSetResponderCapture: (e: GestureResponderEventLike) => boolean } {
  // Normalize against the same screen dimensions reported at session start, so
  // touch coordinates line up with the player's aspect ratio in replay.
  let screenW = 0;
  let screenH = 0;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Dimensions } = require('react-native');
    const d = Dimensions.get('screen');
    screenW = d.width;
    screenH = d.height;
  } catch {
    /* dimensions unavailable — touches won't be normalized, so skip them */
  }

  return {
    onStartShouldSetResponderCapture: (e: GestureResponderEventLike): boolean => {
      try {
        if (screenW > 0 && screenH > 0) {
          const { pageX, pageY } = e.nativeEvent;
          push({
            type:       'touch',
            timestamp:  Date.now(),
            elapsedMs:  getElapsedMs(),
            screenName: getCurrentScreen(),
            x:          Math.min(1, Math.max(0, pageX / screenW)),
            y:          Math.min(1, Math.max(0, pageY / screenH)),
          });
        }
      } catch {
        /* never break the host app's touch handling */
      }
      return false; // do not capture the responder — UI keeps working
    },
  };
}
