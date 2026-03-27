package app.uxclone.sdk

import android.app.Activity
import android.app.Application
import android.os.Bundle

/** Minimal lifecycle adapter that flushes events when any Activity pauses. */
internal class UXLifecycleCallbacks(
    private val onPause: () -> Unit
) : Application.ActivityLifecycleCallbacks {
    override fun onActivityPaused(a: Activity)   { onPause() }
    override fun onActivityCreated(a: Activity, b: Bundle?)  {}
    override fun onActivityStarted(a: Activity)  {}
    override fun onActivityResumed(a: Activity)  {}
    override fun onActivityStopped(a: Activity)  {}
    override fun onActivitySaveInstanceState(a: Activity, b: Bundle) {}
    override fun onActivityDestroyed(a: Activity) {}
}
