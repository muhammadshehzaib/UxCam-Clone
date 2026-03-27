# UXClone Android SDK

Official UXClone session recording SDK for Android (Kotlin/Java).

## Installation

Add to your `build.gradle.kts`:
```kotlin
implementation("app.uxclone:sdk:0.1.0")
```

## Setup

```kotlin
// Application.kt
import app.uxclone.sdk.UXClone

class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        UXClone.initialize(
            context    = this,
            apiKey     = "proj_your_api_key",
            endpoint   = "https://api.uxclone.app",
            appVersion = "2.1.0",
            sampleRate = 1.0,
        )
    }
}
```

## API

| Method | Description |
|--------|-------------|
| `UXClone.initialize(context, apiKey, endpoint)` | Initialize SDK |
| `UXClone.track(name, metadata?)` | Track a custom event |
| `UXClone.trackScreen(name)` | Track a screen view |
| `UXClone.identify(userId, traits?)` | Link user identity |
| `UXClone.flush()` | Flush event queue |
| `UXClone.destroy()` | Tear down SDK |

## ProGuard

Add to your `proguard-rules.pro`:
```
-keep class app.uxclone.sdk.** { *; }
```
