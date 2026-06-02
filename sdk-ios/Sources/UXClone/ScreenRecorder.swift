import UIKit

/// Periodically captures the key window as a downscaled JPEG and forwards each
/// frame. Runs entirely in-process (no extra dependencies) — the native
/// equivalent of the web SDK's DOM recorder.
final class ScreenRecorder {
    private var timer:        Timer?
    private let interval:     TimeInterval
    private let getElapsedMs: () -> Int64
    private let sendFrame:    ([String: Any]) -> Void

    private let maxWidth:    CGFloat = 720    // downscale to keep frames under the 1MB cap
    private let jpegQuality: CGFloat = 0.5

    init(
        interval:     TimeInterval,
        getElapsedMs: @escaping () -> Int64,
        sendFrame:    @escaping ([String: Any]) -> Void
    ) {
        self.interval     = interval
        self.getElapsedMs = getElapsedMs
        self.sendFrame    = sendFrame
    }

    func start() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.timer = Timer.scheduledTimer(withTimeInterval: self.interval, repeats: true) { [weak self] _ in
                self?.capture()
            }
            self.capture()  // immediate first frame so replay has one from t≈0
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }

    /// Must run on the main thread (UIKit rendering).
    private func capture() {
        guard let window = Self.keyWindow() else { return }
        let bounds = window.bounds
        guard bounds.width > 0, bounds.height > 0 else { return }

        let scale      = min(1, maxWidth / bounds.width)
        let targetSize = CGSize(width: bounds.width * scale, height: bounds.height * scale)

        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: targetSize, format: format)
        let image = renderer.image { _ in
            window.drawHierarchy(in: CGRect(origin: .zero, size: targetSize), afterScreenUpdates: false)
        }

        guard let jpeg = image.jpegData(compressionQuality: jpegQuality) else { return }

        let frame: [String: Any] = [
            "elapsedMs": getElapsedMs(),
            "data":      jpeg.base64EncodedString(),
            "width":     Int(bounds.width),
            "height":    Int(bounds.height),
        ]
        sendFrame(frame)
    }

    private static func keyWindow() -> UIWindow? {
        if #available(iOS 13.0, *) {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            let windows = scenes.flatMap { $0.windows }
            return windows.first(where: { $0.isKeyWindow }) ?? windows.first
        } else {
            return UIApplication.shared.keyWindow
        }
    }
}
