package app.uxclone.sdk

import android.app.Application
import android.content.Context
import android.util.DisplayMetrics
import android.view.WindowManager
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.random.Random

/**
 * Main UXClone Android SDK entry point.
 *
 * Usage (in Application.onCreate):
 *   UXClone.initialize(this, apiKey = "proj_xxx", endpoint = "https://api.uxclone.app")
 *
 * Track events:
 *   UXClone.track("button_tapped", mapOf("name" to "checkout"))
 *   UXClone.trackScreen("ProductDetail")
 *   UXClone.identify("user-123", mapOf("plan" to "pro"))
 */
object UXClone {
    private var config:        UXConfig?       = null
    private var sessionMgr:    SessionManager? = null
    private var transport:      Transport?      = null
    private var crashRecorder:  CrashRecorder?  = null
    private var screenRecorder: ScreenRecorder? = null
    private var currentScreen   = "App"
    private var initialized     = false

    // MARK: - Public API

    @JvmStatic
    fun initialize(
        context:         Context,
        apiKey:          String,
        endpoint:        String,
        appVersion:      String  = "1.0.0",
        sampleRate:      Double  = 1.0,
        screenRecording: Boolean = false,
        screenInterval:  Long    = 1_000L,
    ) {
        if (Random.nextDouble() > sampleRate) return

        val cfg = UXConfig(
            apiKey = apiKey, endpoint = endpoint, appVersion = appVersion, sampleRate = sampleRate,
            screenRecording = screenRecording, screenInterval = screenInterval,
        )
        val sm  = SessionManager(context.applicationContext)
        val t   = Transport(cfg, sm::sessionId, sm::anonymousId)

        config     = cfg
        sessionMgr = sm
        transport  = t

        sendSessionStart(context, cfg, sm)

        crashRecorder = CrashRecorder(
            push             = { e -> t.push(e) },
            getElapsedMs     = sm::getElapsedMs,
            getCurrentScreen = { currentScreen },
        )

        val touchRec  = TouchRecorder(
            push             = { e -> t.push(e) },
            getElapsedMs     = sm::getElapsedMs,
            getCurrentScreen = { currentScreen },
        )
        val screenRec = if (cfg.screenRecording)
            ScreenRecorder(cfg.screenInterval, sm::getElapsedMs) { frame -> sendScreenFrame(cfg, sm, frame) }
        else null
        screenRecorder = screenRec

        // Touch + screen capture require an Application context for lifecycle hooks.
        if (context is Application) {
            context.registerActivityLifecycleCallbacks(
                UXLifecycleCallbacks(
                    onPause           = { t.flush() },
                    onResumedActivity = { a -> touchRec.attachToActivity(a); screenRec?.setActivity(a) },
                    onPausedActivity  = { a -> screenRec?.clearActivity(a) },
                )
            )
            screenRec?.start()
        }

        t.startAutoFlush()
        initialized = true
    }

    @JvmStatic
    fun track(name: String, metadata: Map<String, String> = emptyMap()) {
        if (!initialized) return
        transport?.push(UXEvent(UXEventType.CUSTOM, sessionMgr!!.getElapsedMs(), currentScreen, value = name, metadata = metadata))
    }

    @JvmStatic
    fun trackScreen(name: String) {
        if (!initialized) return
        currentScreen = name
        transport?.push(UXEvent(UXEventType.SCREEN_VIEW, sessionMgr!!.getElapsedMs(), name))
    }

    @JvmStatic
    fun identify(userId: String, traits: Map<String, String> = emptyMap()) {
        val cfg = config ?: return
        val sm  = sessionMgr ?: return
        Thread {
            try {
                val payload = JSONObject().apply {
                    put("anonymousId", sm.anonymousId)
                    put("apiKey", cfg.apiKey)
                    put("userId", userId)
                    put("traits", JSONObject(traits as Map<*, *>))
                }
                val url  = URL("${cfg.endpoint}/api/v1/ingest/identify")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true
                conn.outputStream.use { it.write(payload.toString().toByteArray()) }
                conn.responseCode // trigger request
                conn.disconnect()
            } catch (_: Exception) {}
        }.apply { isDaemon = true; start() }
    }

    @JvmStatic
    fun flush() { transport?.flush() }

    @JvmStatic
    fun destroy() {
        transport?.stopAutoFlush()
        transport?.flushSync()
        crashRecorder?.detach()
        screenRecorder?.stop()
        initialized = false
        config = null; sessionMgr = null; transport = null; crashRecorder = null; screenRecorder = null
    }

    // MARK: - Private

    /** Upload a single screenshot frame to the screen-ingest endpoint. */
    private fun sendScreenFrame(cfg: UXConfig, sm: SessionManager, frame: JSONObject) {
        try {
            val payload = JSONObject().apply {
                put("sessionId",   sm.sessionId)
                put("anonymousId", sm.anonymousId)
                put("apiKey",      cfg.apiKey)
                put("frames",      org.json.JSONArray().put(frame))
            }
            val url  = URL("${cfg.endpoint}/api/v1/ingest/screen")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.outputStream.use { it.write(payload.toString().toByteArray()) }
            conn.responseCode
            conn.disconnect()
        } catch (_: Exception) {}
    }

    private fun sendSessionStart(context: Context, cfg: UXConfig, sm: SessionManager) {
        val wm      = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val metrics = DisplayMetrics().also { wm.defaultDisplay.getMetrics(it) }
        Thread {
            try {
                val device = JSONObject().apply {
                    put("type", "mobile")
                    put("os", "android")
                    put("osVersion", android.os.Build.VERSION.RELEASE)
                    put("browser", ""); put("browserVersion", "")
                    put("appVersion", cfg.appVersion)
                    put("screenWidth",  metrics.widthPixels)
                    put("screenHeight", metrics.heightPixels)
                }
                val payload = JSONObject().apply {
                    put("sessionId",   sm.sessionId)
                    put("anonymousId", sm.anonymousId)
                    put("apiKey",      cfg.apiKey)
                    put("startedAt",   System.currentTimeMillis())
                    put("device",      device)
                }
                val url  = URL("${cfg.endpoint}/api/v1/ingest/session/start")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true
                conn.outputStream.use { it.write(payload.toString().toByteArray()) }
                conn.responseCode
                conn.disconnect()
            } catch (_: Exception) {}
        }.apply { isDaemon = true; start() }
    }
}
