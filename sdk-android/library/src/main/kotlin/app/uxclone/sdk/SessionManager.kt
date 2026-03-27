package app.uxclone.sdk

import android.content.Context
import java.util.UUID

/** SharedPreferences-backed session persistence. */
internal class SessionManager(context: Context) {
    companion object {
        private const val PREFS    = "uxclone_prefs"
        private const val ANON_KEY = "anon_id"
    }

    private val prefs     = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val startTime = System.currentTimeMillis()
    val sessionId:   String
    val anonymousId: String

    init {
        // Restore or create anonymous ID
        anonymousId = prefs.getString(ANON_KEY, null) ?: run {
            val id = "anon_${UUID.randomUUID()}"
            prefs.edit().putString(ANON_KEY, id).apply()
            id
        }
        // Always fresh session ID
        sessionId = UUID.randomUUID().toString()
    }

    fun getElapsedMs(): Long = System.currentTimeMillis() - startTime
}
