// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "ChiriMacOSBridge",
    platforms: [
        .macOS(.v10_15)
    ],
    products: [
        .library(
            name: "ChiriMacOSBridge",
            type: .static,
            targets: ["ChiriMacOSBridge"]
        )
    ],
    targets: [
        .target(
            name: "ChiriMacOSBridge",
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("ApplicationServices"),
                .linkedFramework("Foundation"),
                .linkedFramework("ServiceManagement"),
                .linkedFramework("UserNotifications"),
            ]
        )
    ]
)
