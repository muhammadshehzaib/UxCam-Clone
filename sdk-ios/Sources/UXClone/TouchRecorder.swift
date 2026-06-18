import UIKit
import ObjectiveC.runtime

/// Captures every touch app-wide by swizzling `UIWindow.sendEvent(_:)`.
/// Records the `.began` phase of each touch as a normalized (0–1) tap, so it
/// lines up with the screenshot frames and the player's aspect ratio in replay.
final class TouchRecorder {
    static var push:             ((UXEvent) -> Void)?
    static var getElapsedMs:     (() -> Int64)?
    static var getCurrentScreen: (() -> String)?

    private static var swizzled = false

    static func attach(
        push:             @escaping (UXEvent) -> Void,
        getElapsedMs:     @escaping () -> Int64,
        getCurrentScreen: @escaping () -> String
    ) {
        self.push             = push
        self.getElapsedMs     = getElapsedMs
        self.getCurrentScreen = getCurrentScreen
        swizzleIfNeeded()
    }

    static func detach() {
        // Leave the swizzle in place (swapping back is racy); just drop the
        // callbacks so no further events are recorded.
        push = nil
        getElapsedMs = nil
        getCurrentScreen = nil
    }

    private static func swizzleIfNeeded() {
        guard !swizzled else { return }
        swizzled = true
        guard
            let original = class_getInstanceMethod(UIWindow.self, #selector(UIWindow.sendEvent(_:))),
            let replacement = class_getInstanceMethod(UIWindow.self, #selector(UIWindow.ux_sendEvent(_:)))
        else { return }
        method_exchangeImplementations(original, replacement)
    }
}

extension UIWindow {
    /// Swizzled in place of `sendEvent(_:)`. Because the implementations are
    /// exchanged, calling `ux_sendEvent` here actually invokes the original.
    @objc func ux_sendEvent(_ event: UIEvent) {
        ux_sendEvent(event)  // original implementation

        guard
            event.type == .touches,
            let touch = event.allTouches?.first,
            touch.phase == .began,
            let push = TouchRecorder.push,
            let getElapsedMs = TouchRecorder.getElapsedMs,
            let getCurrentScreen = TouchRecorder.getCurrentScreen
        else { return }

        let w = bounds.width
        let h = bounds.height
        guard w > 0, h > 0 else { return }

        let loc = touch.location(in: self)
        let nx = min(1, max(0, Double(loc.x / w)))
        let ny = min(1, max(0, Double(loc.y / h)))

        push(UXEvent(type: .touch, elapsedMs: getElapsedMs(), screenName: getCurrentScreen(), x: nx, y: ny))
    }
}
