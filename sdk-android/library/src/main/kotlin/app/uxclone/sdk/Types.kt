package app.uxclone.sdk

import org.json.JSONObject

enum class UXEventType(val value: String) {
    TOUCH("touch"),
    SCROLL("scroll"),
    SCREEN_VIEW("screen_view"),
    NAVIGATE("navigate"),
    CUSTOM("custom"),
    CRASH("crash"),
    NETWORK("network"),
}

data class UXEvent(
    val type:       String,
    val timestamp:  Long,
    val elapsedMs:  Long,
    val x:          Double? = null,
    val y:          Double? = null,
    val screenName: String? = null,
    val value:      String? = null,
    val metadata:   Map<String, String>? = null,
) {
    constructor(
        type:       UXEventType,
        elapsedMs:  Long,
        screenName: String? = null,
        x:          Double? = null,
        y:          Double? = null,
        value:      String? = null,
        metadata:   Map<String, String>? = null,
    ) : this(
        type       = type.value,
        timestamp  = System.currentTimeMillis(),
        elapsedMs  = elapsedMs,
        x          = x,
        y          = y,
        screenName = screenName,
        value      = value,
        metadata   = metadata,
    )

    fun toJson(): JSONObject = JSONObject().apply {
        put("type",       type)
        put("timestamp",  timestamp)
        put("elapsedMs",  elapsedMs)
        x?.let          { put("x",          it) }
        y?.let          { put("y",          it) }
        screenName?.let { put("screenName", it) }
        value?.let      { put("value",      it) }
        metadata?.let   { m ->
            put("metadata", JSONObject(m as Map<*, *>))
        }
    }
}

data class UXConfig(
    val apiKey:        String,
    val endpoint:      String,
    val flushInterval: Long   = 5_000L,   // ms
    val maxBatchSize:  Int    = 50,
    val sampleRate:    Double = 1.0,
    val appVersion:    String = "1.0.0",
)
