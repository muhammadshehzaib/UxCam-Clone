// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "UXClone",
    platforms: [.iOS(.v14)],
    products: [
        .library(name: "UXClone", targets: ["UXClone"]),
    ],
    targets: [
        .target(
            name: "UXClone",
            path: "Sources/UXClone"
        ),
        .testTarget(
            name: "UXCloneTests",
            dependencies: ["UXClone"],
            path: "Tests/UXCloneTests"
        ),
    ]
)
