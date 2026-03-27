import Foundation

typealias PushFn = (UXEvent) -> Void

/// Captures uncaught Objective-C exceptions and routes them as crash events.
final class CrashRecorder {
    private let push:          PushFn
    private let getElapsedMs:  () -> Int64
    private let getCurrentScreen: () -> String
    private let previousHandler: NSUncaughtExceptionHandler?

    init(push: @escaping PushFn, getElapsedMs: @escaping () -> Int64, getCurrentScreen: @escaping () -> String) {
        self.push             = push
        self.getElapsedMs     = getElapsedMs
        self.getCurrentScreen = getCurrentScreen
        self.previousHandler  = NSGetUncaughtExceptionHandler()
        self.attach()
    }

    private func attach() {
        NSSetUncaughtExceptionHandler { [weak self] exception in
            guard let self = self else { return }
            let event = UXEvent(
                type:       .crash,
                elapsedMs:  self.getElapsedMs(),
                screenName: self.getCurrentScreen(),
                value:      String(exception.name.rawValue.prefix(500)),
                metadata:   [
                    "reason":     String(exception.reason?.prefix(500) ?? ""),
                    "error_type": "nsexception",
                ]
            )
            self.push(event)
            // Chain to previous handler
            self.previousHandler?(exception)
        }
    }

    func detach() {
        NSSetUncaughtExceptionHandler(previousHandler)
    }
}
