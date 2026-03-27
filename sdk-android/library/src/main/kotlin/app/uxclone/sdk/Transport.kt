package app.uxclone.sdk

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.ScheduledThreadPoolExecutor
import java.util.concurrent.TimeUnit

/** Thread-safe event queue with timed flush to the backend. */
internal class Transport(
    private val config:       UXConfig,
    private val getSessionId: () -> String,
    private val getAnonId:    () -> String,
) {
    private val queue:     LinkedBlockingQueue<UXEvent> = LinkedBlockingQueue()
    private var scheduler: ScheduledExecutorService?   = null
    private var retryCount = 0

    fun push(event: UXEvent) {
        queue.offer(event)
        if (queue.size >= config.maxBatchSize) flush()
    }

    fun startAutoFlush() {
        val s = ScheduledThreadPoolExecutor(1)
        scheduler = s
        s.scheduleWithFixedDelay({ flush() }, config.flushInterval, config.flushInterval, TimeUnit.MILLISECONDS)
    }

    fun stopAutoFlush() {
        scheduler?.shutdown()
        scheduler = null
    }

    fun flush() {
        if (queue.isEmpty()) return
        val batch = mutableListOf<UXEvent>()
        queue.drainTo(batch, config.maxBatchSize)
        if (batch.isNotEmpty()) sendBatch(batch)
    }

    fun flushSync() {
        val batch = mutableListOf<UXEvent>()
        queue.drainTo(batch)
        if (batch.isNotEmpty()) sendBatch(batch, retries = 0)
    }

    private fun sendBatch(events: List<UXEvent>, retries: Int = 3) {
        Thread {
            try {
                val payload = JSONObject().apply {
                    put("sessionId",   getSessionId())
                    put("anonymousId", getAnonId())
                    put("apiKey",      config.apiKey)
                    put("events",      JSONArray(events.map { it.toJson() }))
                }
                val url  = URL("${config.endpoint}/api/v1/ingest/batch")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true
                conn.outputStream.use { it.write(payload.toString().toByteArray()) }

                val code = conn.responseCode
                if (code >= 500 && retries > 0) {
                    Thread.sleep(1_000L * (4 - retries))
                    sendBatch(events, retries - 1)
                }
                conn.disconnect()
            } catch (e: Exception) {
                if (retries > 0) {
                    Thread.sleep(1_000L)
                    sendBatch(events, retries - 1)
                }
            }
        }.apply { isDaemon = true; start() }
    }
}
