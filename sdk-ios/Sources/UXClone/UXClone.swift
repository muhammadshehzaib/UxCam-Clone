import Foundation
import UIKit

/// Main UXClone iOS SDK entry point.
public final class UXClone {
    public static let shared = UXClone()

    private var config:        UXConfig?
    private var sessionMgr:    SessionManager?
    private var transport:     Transport?
    private var crashRecorder: CrashRecorder?
    private var currentScreen  = "App"
    private var initialized    = false

    private init() {}

    // MARK: - Public API

    /// Initialize the SDK. Call once in `application(_:didFinishLaunchingWithOptions:)`.
    public func initialize(apiKey: String, endpoint: String, appVersion: String = "1.0.0", sampleRate: Double = 1.0) {
        guard Double.random(in: 0...1) <= sampleRate else { return }

        let cfg    = UXConfig(apiKey: apiKey, endpoint: endpoint, appVersion: appVersion, sampleRate: sampleRate)
        let sm     = SessionManager()
        let t      = Transport(config: cfg, getSessionId: sm.getSessionId, getAnonId: sm.getAnonymousId)

        config     = cfg
        sessionMgr = sm
        transport  = t

        sendSessionStart()

        crashRecorder = CrashRecorder(
            push:             { [weak self] e in self?.transport?.push(e) },
            getElapsedMs:     sm.getElapsedMs,
            getCurrentScreen: { [weak self] in self?.currentScreen ?? "App" }
        )

        // Register network interceptor
        UXCloneURLProtocol.push             = { [weak self] e in self?.transport?.push(e) }
        UXCloneURLProtocol.getElapsedMs     = sm.getElapsedMs
        UXCloneURLProtocol.getCurrentScreen = { [weak self] in self?.currentScreen ?? "App" }
        UXCloneURLProtocol.sdkEndpoint      = endpoint
        URLProtocol.registerClass(UXCloneURLProtocol.self)

        // Flush on app background
        NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: nil) { [weak self] _ in
            self?.transport?.flush()
        }

        t.startAutoFlush()
        initialized = true
    }

    /// Track a custom event.
    public func track(_ name: String, metadata: [String: String] = [:]) {
        guard initialized, let sm = sessionMgr else { return }
        transport?.push(UXEvent(type: .custom, elapsedMs: sm.getElapsedMs(), screenName: currentScreen, value: name, metadata: metadata))
    }

    /// Track a screen view. Call in `viewWillAppear` or equivalent.
    public func trackScreen(_ name: String) {
        guard initialized, let sm = sessionMgr else { return }
        currentScreen = name
        transport?.push(UXEvent(type: .screenView, elapsedMs: sm.getElapsedMs(), screenName: name))
    }

    /// Link an anonymous user to your app's user ID.
    public func identify(userId: String, traits: [String: String] = [:]) {
        guard initialized, let cfg = config, let sm = sessionMgr else { return }
        var body: [String: Any] = ["anonymousId": sm.getAnonymousId(), "apiKey": cfg.apiKey, "userId": userId, "traits": traits]
        guard let data = try? JSONSerialization.data(withJSONObject: body),
              let url  = URL(string: "\(cfg.endpoint)/api/v1/ingest/identify") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"; req.httpBody = data
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        URLSession.shared.dataTask(with: req).resume()
    }

    /// Flush queued events immediately.
    public func flush() { transport?.flush() }

    /// Tear down the SDK.
    public func destroy() {
        transport?.stopAutoFlush()
        transport?.flush()
        crashRecorder?.detach()
        URLProtocol.unregisterClass(UXCloneURLProtocol.self)
        initialized = false
        config = nil; sessionMgr = nil; transport = nil; crashRecorder = nil
    }

    // MARK: - Private

    private func sendSessionStart() {
        guard let cfg = config, let sm = sessionMgr,
              let url = URL(string: "\(cfg.endpoint)/api/v1/ingest/session/start") else { return }
        let screen = UIScreen.main
        let device: [String: Any] = [
            "type": UIDevice.current.userInterfaceIdiom == .phone ? "mobile" : "tablet",
            "os": "ios", "osVersion": UIDevice.current.systemVersion,
            "browser": "", "browserVersion": "",
            "appVersion": cfg.appVersion,
            "screenWidth":  Int(screen.bounds.width),
            "screenHeight": Int(screen.bounds.height),
        ]
        let payload: [String: Any] = [
            "sessionId":   sm.getSessionId(), "anonymousId": sm.getAnonymousId(),
            "apiKey":      cfg.apiKey, "startedAt": Int64(Date().timeIntervalSince1970 * 1000),
            "device":      device,
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: payload) else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"; req.httpBody = data
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        URLSession.shared.dataTask(with: req).resume()
    }
}
