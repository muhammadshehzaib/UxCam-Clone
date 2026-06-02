package app.uxclone.sdk

import android.app.Activity
import android.app.Application
import android.os.Bundle

/**
 * Lifecycle adapter that flushes events when any Activity pauses, and surfaces
 * resume/pause hooks so the touch + screen recorders can track the foreground
 * Activity.
 */
internal class UXLifecycleCallbacks(
    private val onPause:           () -> Unit,
    private val onResumedActivity: (Activity) -> Unit = {},
    private val onPausedActivity:  (Activity) -> Unit = {},
) : Application.ActivityLifecycleCallbacks {
    override fun onActivityResumed(a: Activity)  { onResumedActivity(a) }
    override fun onActivityPaused(a: Activity)   { onPause(); onPausedActivity(a) }
    override fun onActivityCreated(a: Activity, b: Bundle?)  {}
    override fun onActivityStarted(a: Activity)  {}
    override fun onActivityStopped(a: Activity)  {}
    override fun onActivitySaveInstanceState(a: Activity, b: Bundle) {}
    override fun onActivityDestroyed(a: Activity) {}
}
