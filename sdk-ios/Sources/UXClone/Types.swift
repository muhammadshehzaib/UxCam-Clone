import Foundation

// MARK: - Event Types

public enum UXEventType: String, Codable {
    case touch        = "touch"
    case scroll       = "scroll"
    case screenView   = "screen_view"
    case navigate     = "navigate"
    case custom       = "custom"
    case crash        = "crash"
    case network      = "network"
}

// MARK: - SDK Event

public struct UXEvent: Codable {
    public let type:       String
    public let timestamp:  Int64    // Unix ms
    public let elapsedMs:  Int64
    public var x:          Double?  // normalized 0–1
    public var y:          Double?
    public var screenName: String?
    public var value:      String?
    public var metadata:   [String: String]?

    public init(
        type:       UXEventType,
        elapsedMs:  Int64,
        screenName: String? = nil,
        x:          Double? = nil,
        y:          Double? = nil,
        value:      String? = nil,
        metadata:   [String: String]? = nil
    ) {
        self.type       = type.rawValue
        self.timestamp  = Int64(Date().timeIntervalSince1970 * 1000)
        self.elapsedMs  = elapsedMs
        self.screenName = screenName
        self.x          = x
        self.y          = y
        self.value      = value
        self.metadata   = metadata
    }
}

// MARK: - Device Info

public struct UXDeviceInfo: Codable {
    public let type:           String
    public let os:             String
    public let osVersion:      String
    public let model:          String
    public let browser:        String
    public let browserVersion: String
    public let appVersion:     String
    public let screenWidth:    Int
    public let screenHeight:   Int
}

// MARK: - Config

public struct UXConfig {
    public let apiKey:        String
    public let endpoint:      String
    public var flushInterval: TimeInterval
    public var maxBatchSize:  Int
    public var sampleRate:    Double
    public var appVersion:    String

    public init(
        apiKey:        String,
        endpoint:      String,
        flushInterval: TimeInterval = 5.0,
        maxBatchSize:  Int = 50,
        sampleRate:    Double = 1.0,
        appVersion:    String = "1.0.0"
    ) {
        self.apiKey        = apiKey
        self.endpoint      = endpoint
        self.flushInterval = flushInterval
        self.maxBatchSize  = maxBatchSize
        self.sampleRate    = sampleRate
        self.appVersion    = appVersion
    }
}
