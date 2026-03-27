import Foundation

/// Thread-safe HTTP transport with automatic batching and retry.
final class Transport {
    private var queue:        [UXEvent]        = []
    private let queueLock                      = NSLock()
    private var flushTimer:   Timer?
    private let config:       UXConfig
    private let getSessionId: () -> String
    private let getAnonId:    () -> String
    private let session:      URLSession

    init(config: UXConfig, getSessionId: @escaping () -> String, getAnonId: @escaping () -> String) {
        self.config       = config
        self.getSessionId = getSessionId
        self.getAnonId    = getAnonId

        // Use background session so requests survive app backgrounding
        let cfg = URLSessionConfiguration.background(withIdentifier: "app.uxclone.sdk")
        cfg.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: cfg)
    }

    func push(_ event: UXEvent) {
        queueLock.lock()
        queue.append(event)
        let count = queue.count
        queueLock.unlock()

        if count >= config.maxBatchSize { flush() }
    }

    func startAutoFlush() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.flushTimer = Timer.scheduledTimer(withTimeInterval: self.config.flushInterval, repeats: true) { [weak self] _ in
                self?.flush()
            }
        }
    }

    func stopAutoFlush() {
        flushTimer?.invalidate()
        flushTimer = nil
    }

    func flush() {
        queueLock.lock()
        guard !queue.isEmpty else { queueLock.unlock(); return }
        let batch = Array(queue.prefix(config.maxBatchSize))
        queue.removeFirst(min(config.maxBatchSize, queue.count))
        queueLock.unlock()

        sendBatch(batch)
    }

    private func sendBatch(_ events: [UXEvent], retryCount: Int = 0) {
        guard let url = URL(string: "\(config.endpoint)/api/v1/ingest/batch") else { return }

        let payload: [String: Any] = [
            "sessionId":   getSessionId(),
            "anonymousId": getAnonId(),
            "apiKey":      config.apiKey,
            "events":      events.compactMap { try? JSONSerialization.jsonObject(with: JSONEncoder().encode($0)) },
        ]
        guard let body = try? JSONSerialization.data(withJSONObject: payload) else { return }

        var req = URLRequest(url: url)
        req.httpMethod  = "POST"
        req.httpBody    = body
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: req) { [weak self] _, response, error in
            guard let self = self else { return }
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            if error != nil || (statusCode >= 400 && statusCode < 500 == false) {
                if retryCount < 3 {
                    DispatchQueue.global().asyncAfter(deadline: .now() + Double(retryCount + 1)) {
                        self.sendBatch(events, retryCount: retryCount + 1)
                    }
                }
            }
        }.resume()
    }
}
