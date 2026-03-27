# @uxclone/react-native

Official UXClone SDK for React Native. Tracks touch events, screen navigation, crashes, and network failures — using the same backend as the web SDK.

## Installation

```bash
npm install @uxclone/react-native @react-native-async-storage/async-storage
```

## Setup

```typescript
// App.tsx
import { UXCloneRN } from '@uxclone/react-native';
import { NavigationContainer } from '@react-navigation/native';

// Initialise once, early in your app
UXCloneRN.init({
  apiKey:      'proj_your_api_key',
  endpoint:    'https://api.uxclone.app',
  appVersion:  '2.1.0',
  sampleRate:  1.0,  // 0–1, record 100% of sessions
});

// Auto-track screens with React Navigation
export default function App() {
  return (
    <NavigationContainer onStateChange={UXCloneRN.onNavigationStateChange}>
      {/* your navigator */}
    </NavigationContainer>
  );
}
```

## API

| Method | Description |
|--------|-------------|
| `UXCloneRN.init(config)` | Initialize SDK (call once) |
| `UXCloneRN.track(name, metadata?)` | Track a custom event |
| `UXCloneRN.trackScreen(name)` | Manual screen tracking |
| `UXCloneRN.identify(userId, traits?)` | Link user identity |
| `UXCloneRN.onNavigationStateChange(state)` | React Navigation hook |
| `UXCloneRN.recordTouch(x, y, componentName?)` | Manual touch recording |
| `UXCloneRN.flush()` | Flush event queue |
| `UXCloneRN.destroy()` | Tear down SDK |

## What gets captured automatically

- **Crashes** — unhandled JS errors via `ErrorUtils.setGlobalHandler`
- **Network failures** — failed fetch calls (status ≥ 400) via fetch patching
- **Screen views** — via `onNavigationStateChange`
- **Custom events** — via `UXCloneRN.track()`

## Privacy

- No screen content is captured (no DOM, no screenshots)
- Touch coordinates are normalized (0–1) — no absolute pixel values
- All data is sent to your own backend
