const SOURCES: &[&str] = &[
    "native/macos/AppMenu.m",
    "native/macos/AppNap.m",
    "native/macos/LoginItem.m",
    "native/macos/Notifications.m",
    "native/macos/WindowControls.m",
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
        .flag("-Wno-unguarded-availability-new")
        .compile("chiri_macos_objc_bridge");

    for framework in FRAMEWORKS {
        println!("cargo:rustc-link-lib=framework={framework}");
    }
}
