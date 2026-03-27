package app.uxclone.sdk

/** Captures unhandled JVM exceptions by decorating the default handler. */
internal class CrashRecorder(
    private val push:             (UXEvent) -> Unit,
    private val getElapsedMs:     () -> Long,
    private val getCurrentScreen: () -> String,
) {
    private val previousHandler = Thread.getDefaultUncaughtExceptionHandler()

    init { attach() }

    private fun attach() {
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            val event = UXEvent(
                type       = UXEventType.CRASH,
                elapsedMs  = getElapsedMs(),
                screenName = getCurrentScreen(),
                value      = throwable.message?.take(500) ?: "Unknown error",
                metadata   = mapOf(
                    "stack"      to (throwable.stackTraceToString().take(2000)),
                    "thread"     to thread.name,
                    "error_type" to "uncaught_exception",
                )
            )
            push(event)
            previousHandler?.uncaughtException(thread, throwable)
        }
    }

    fun detach() {
        Thread.setDefaultUncaughtExceptionHandler(previousHandler)
    }
}
