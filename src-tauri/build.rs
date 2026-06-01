#[cfg(target_os = "macos")]
#[path = "build/liquid_glass_icon.rs"]
mod liquid_glass_icon;

#[cfg(target_os = "macos")]
#[path = "build/objc_bridge.rs"]
mod objc_bridge;

fn main() {
    // compile macOS liquid glass icon first: tauri_build::build() checks for
    // gen/Assets.car as a resource and will panic if it doesn't exist yet.
    if target_os() == Some("macos") {
        #[cfg(target_os = "macos")]
        {
            liquid_glass_icon::compile();
            objc_bridge::compile();
        }

        #[cfg(not(target_os = "macos"))]
        panic!("macOS Tauri builds must run on a macOS host");
    }

    tauri_build::build();
}

fn target_os() -> Option<&'static str> {
    match std::env::var("CARGO_CFG_TARGET_OS").ok()?.as_str() {
        "macos" => Some("macos"),
        _ => None,
    }
}
