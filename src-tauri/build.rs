#[cfg(target_os = "macos")]
mod liquid_glass_icon;

fn main() {
    // compile macOS liquid glass icon first: tauri_build::build() checks for
    // gen/Assets.car as a resource and will panic if it doesn't exist yet.
    #[cfg(target_os = "macos")]
    {
        liquid_glass_icon::compile_icon();
        compile_macos_ffi();
    }

    tauri_build::build();
}

#[cfg(target_os = "macos")]
fn compile_macos_ffi() {
    cc::Build::new()
        .files(["src/notifications/permissions.m", "src/macos/login_item.m"])
        .flag("-fmodules")
        .flag("-fobjc-arc")
        .flag("-Wno-unguarded-availability-new")
        .compile("macos_ffi");

    for framework in [
        "ApplicationServices",
        "Foundation",
        "ServiceManagement",
        "UserNotifications",
    ] {
        println!("cargo:rustc-link-lib=framework={framework}");
    }
}
