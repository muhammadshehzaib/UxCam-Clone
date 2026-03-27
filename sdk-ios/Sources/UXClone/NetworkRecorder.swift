import Foundation

/// URLProtocol subclass that intercepts failed network requests (status ≥ 400).
final class UXCloneURLProtocol: URLProtocol {
    static var push:          PushFn?
    static var getElapsedMs:  (() -> Int64)?
    static var getCurrentScreen: (() -> String)?
    static var sdkEndpoint:   String = ""

    private var dataTask: URLSessionDataTask?
    private let startMs: Int64

    override init(request: URLRequest, cachedResponse: CachedURLResponse?, client: URLProtocolClient?) {
        self.startMs = UXCloneURLProtocol.getElapsedMs?() ?? 0
        super.init(request: request, cachedResponse: cachedResponse, client: client)
    }

    override class func canInit(with request: URLRequest) -> Bool {
        guard let url = request.url?.absoluteString else { return false }
        // Don't intercept our own endpoint
        return !url.hasPrefix(sdkEndpoint) && URLProtocol.property(forKey: "UXClone", in: request) == nil
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        var mutableReq = request
        URLProtocol.setProperty(true, forKey: "UXClone", in: &mutableReq)

        dataTask = URLSession.shared.dataTask(with: mutableReq) { [weak self] data, response, error in
            guard let self = self else { return }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0

            if error != nil || status >= 400 {
                let url    = self.request.url?.absoluteString ?? ""
                let method = self.request.httpMethod ?? "GET"
                let event  = UXEvent(
                    type:       .network,
                    elapsedMs:  self.startMs,
                    screenName: UXCloneURLProtocol.getCurrentScreen?(),
                    value:      String(status),
                    metadata:   [
                        "url":         self.sanitize(url),
                        "method":      method,
                        "status":      String(status),
                        "duration_ms": String(UXCloneURLProtocol.getElapsedMs?() ?? 0 - self.startMs),
                    ]
                )
                UXCloneURLProtocol.push?(event)
            }

            if let error = error {
                self.client?.urlProtocol(self, didFailWithError: error)
            } else {
                if let response = response { self.client?.urlProtocol(self, didReceiveResponse: response, cacheStoragePolicy: .notAllowed) }
                if let data = data         { self.client?.urlProtocol(self, didLoad: data) }
                self.client?.urlProtocolDidFinishLoading(self)
            }
        }
        dataTask?.resume()
    }

    override func stopLoading() { dataTask?.cancel() }

    private func sanitize(_ url: String) -> String {
        guard let components = URLComponents(string: url) else { return url }
        var c = components; c.query = nil; c.fragment = nil
        return c.url?.absoluteString ?? url
    }
}
