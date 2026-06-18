package app.uxclone.sdk

import android.app.Activity
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Handler
import android.os.Looper
import android.util.Base64
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.lang.ref.WeakReference

/**
 * Periodically captures the current Activity's decor view as a downscaled JPEG
 * and forwards each frame. Draws the view hierarchy to a Bitmap (no extra
 * permissions or dependencies) — the native equivalent of the web DOM recorder.
 * Note: SurfaceView/GL/secure content won't appear in a Canvas-drawn capture.
 */
internal class ScreenRecorder(
    private val intervalMs:   Long,
    private val getElapsedMs: () -> Long,
    private val sendFrame:    (JSONObject) -> Unit,
) {
    private val handler      = Handler(Looper.getMainLooper())
    private var activityRef: WeakReference<Activity>? = null
    private var running      = false

    private val maxWidth     = 720
    private val jpegQuality  = 50

    private val tick = object : Runnable {
        override fun run() {
            if (!running) return
            capture()
            handler.postDelayed(this, intervalMs)
        }
    }

    fun setActivity(activity: Activity) { activityRef = WeakReference(activity) }

    fun clearActivity(activity: Activity) {
        if (activityRef?.get() === activity) activityRef = null
    }

    fun start() {
        if (running) return
        running = true
        handler.post(tick)
    }

    fun stop() {
        running = false
        handler.removeCallbacks(tick)
    }

    /** Runs on the main thread (UIView rendering); encodes + uploads off-thread. */
    private fun capture() {
        val activity = activityRef?.get() ?: return
        val view = activity.window?.decorView ?: return
        val w = view.width
        val h = view.height
        if (w <= 0 || h <= 0) return

        try {
            val full = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            view.draw(Canvas(full))

            val scale = minOf(1f, maxWidth.toFloat() / w)
            val bmp = if (scale < 1f)
                Bitmap.createScaledBitmap(full, (w * scale).toInt(), (h * scale).toInt(), true)
            else full

            val elapsed = getElapsedMs()
            Thread {
                try {
                    val baos = ByteArrayOutputStream()
                    bmp.compress(Bitmap.CompressFormat.JPEG, jpegQuality, baos)
                    val b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
                    val frame = JSONObject().apply {
                        put("elapsedMs", elapsed)
                        put("data",      b64)
                        put("width",     w)
                        put("height",    h)
                    }
                    sendFrame(frame)
                } catch (_: Exception) { /* a single failed frame is non-fatal */ }
            }.apply { isDaemon = true; start() }
        } catch (_: Exception) { /* capture failed — keep the timer running */ }
    }
}
