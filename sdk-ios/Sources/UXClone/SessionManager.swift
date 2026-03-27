import Foundation

/// Manages session and anonymous ID persistence via UserDefaults.
final class SessionManager {
    private static let anonKey    = "uxclone_anon_id"
    private static let sessionKey = "uxclone_session_id"

    private let startDate: Date
    private let sessionId: String
    private let anonymousId: String

    init() {
        self.startDate = Date()

        // Create or restore anonymous ID
        if let existing = UserDefaults.standard.string(forKey: Self.anonKey) {
            self.anonymousId = existing
        } else {
            let anon = "anon_\(UUID().uuidString)"
            UserDefaults.standard.set(anon, forKey: Self.anonKey)
            self.anonymousId = anon
        }

        // Always create a fresh session ID
        let sid = UUID().uuidString
        UserDefaults.standard.set(sid, forKey: Self.sessionKey)
        self.sessionId = sid
    }

    func getSessionId()  -> String { sessionId }
    func getAnonymousId() -> String { anonymousId }

    func getElapsedMs() -> Int64 {
        Int64(Date().timeIntervalSince(startDate) * 1000)
    }
}
