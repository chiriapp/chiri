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
        // the app runs on 12.0, where an unguarded call into a newer API is a
        // crash; the two sources that do it behind runtime checks carry a
        // local diagnostic pragma instead of a blanket suppression here
        .flag("-Werror=unguarded-availability-new")
        .compile("chiri_macos_objc_bridge");

    for framework in FRAMEWORKS {
        println!("cargo:rustc-link-lib=framework={framework}");
    }
}
