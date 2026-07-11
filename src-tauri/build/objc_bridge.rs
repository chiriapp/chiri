const SOURCES: &[&str] = &[
    "macos/native/AppMenu.m",
    "macos/native/AppNap.m",
    "macos/native/DockMenu.m",
    "macos/native/LoginItem.m",
    "macos/native/Notifications.m",
    "macos/native/WindowControls.m",
];

const FRAMEWORKS: &[&str] = &[
    "AppKit",
    "ApplicationServices",
    "Foundation",
    "ServiceManagement",
    "UserNotifications",
];

pub fn compile() {
    let mut build = cc::Build::new();

    for source in SOURCES {
        build.file(source);
        println!("cargo:rerun-if-changed={source}");
    }

    build
        .flag("-fobjc-arc")
        .flag("-fblocks")
        .flag("-fmodules")
        .flag("-mmacosx-version-min=12.0")
        .flag("-Wno-unguarded-availability-new")
        .compile("chiri_macos_objc_bridge");

    for framework in FRAMEWORKS {
        println!("cargo:rustc-link-lib=framework={framework}");
    }
}
