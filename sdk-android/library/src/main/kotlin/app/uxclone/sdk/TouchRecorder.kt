package app.uxclone.sdk

import android.app.Activity
import android.view.MotionEvent
import android.view.Window

/**
 * Captures every touch by wrapping each Activity's Window.Callback. Uses Kotlin
 * interface delegation (`by delegate`) so all the version-specific callback
 * methods are forwarded automatically and only dispatchTouchEvent is observed.
 * Records the ACTION_DOWN of each gesture as a normalized (0–1) tap.
 */
internal class TouchRecorder(
    private val push:             (UXEvent) -> Unit,
    private val getElapsedMs:     () -> Long,
    private val getCurrentScreen: () -> String,
) {
    fun attachToActivity(activity: Activity) {
        val current = activity.window.callback ?: return
        if (current is UXWindowCallback) return  // already wrapped
        activity.window.callback =
            UXWindowCallback(current, activity, push, getElapsedMs, getCurrentScreen)
    }
}

private class UXWindowCallback(
    private val delegate:         Window.Callback,
    private val activity:         Activity,
    private val push:             (UXEvent) -> Unit,
    private val getElapsedMs:     () -> Long,
    private val getCurrentScreen: () -> String,
) : Window.Callback by delegate {

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_DOWN) {
            val view = activity.window.decorView
            val w = view.width
            val h = view.height
            if (w > 0 && h > 0) {
                val nx = (event.x / w).toDouble().coerceIn(0.0, 1.0)
                val ny = (event.y / h).toDouble().coerceIn(0.0, 1.0)
                push(UXEvent(UXEventType.TOUCH, getElapsedMs(), getCurrentScreen(), x = nx, y = ny))
            }
        }
        return delegate.dispatchTouchEvent(event)
    }
}
