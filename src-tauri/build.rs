#[cfg(target_os = "macos")]
mod liquid_glass_icon;

#[cfg(target_os = "macos")]
use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};

fn main() {
    // compile macOS liquid glass icon first: tauri_build::build() checks for
    // gen/Assets.car as a resource and will panic if it doesn't exist yet.
    #[cfg(target_os = "macos")]
    {
        liquid_glass_icon::compile_icon();
        compile_macos_swift_bridge();
    }

    tauri_build::build();
}

#[cfg(target_os = "macos")]
fn compile_macos_swift_bridge() {
    const LIBRARY_NAME: &str = "ChiriMacOSBridge";

    let manifest_dir = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let package_dir = manifest_dir.join("swift");
    let source_dir = package_dir.join("Sources").join(LIBRARY_NAME);
    let out_dir = PathBuf::from(env::var_os("OUT_DIR").unwrap()).join("swift");
    fs::create_dir_all(&out_dir).expect("failed to create Swift output directory");

    let sources = swift_sources(&source_dir);
    let target = swift_target_triple();
    let mut command = xcode_tool_command("swiftc");
    command
        .arg("-emit-library")
        .arg("-static")
        .arg("-parse-as-library")
        .arg("-module-name")
        .arg(LIBRARY_NAME)
        .arg("-target")
        .arg(&target)
        .arg("-o")
        .arg(out_dir.join(format!("lib{LIBRARY_NAME}.a")));

    let sdk_path = macos_sdk_path();
    if let Some(sdk_path) = &sdk_path {
        command.arg("-sdk").arg(sdk_path);
    }

    command.args(&sources);

    let status = command.status().expect("failed to invoke swiftc");
    assert!(status.success(), "failed to compile Swift macOS bridge");

    println!("cargo:rerun-if-changed={}", package_dir.display());
    println!("cargo:rustc-link-search=native={}", out_dir.display());
    println!("cargo:rustc-link-lib=static={LIBRARY_NAME}");

    link_swift_runtime(&target);
    if let Some(sdk_path) = &sdk_path {
        link_macos_sdk_libraries(sdk_path);
    }

    for framework in [
        "AppKit",
        "ApplicationServices",
        "Foundation",
        "ServiceManagement",
        "UserNotifications",
    ] {
        println!("cargo:rustc-link-lib=framework={framework}");
    }
}

#[cfg(target_os = "macos")]
fn swift_sources(source_dir: &Path) -> Vec<PathBuf> {
    fn collect(dir: &Path, sources: &mut Vec<PathBuf>) {
        for entry in fs::read_dir(dir).unwrap_or_else(|e| {
            panic!(
                "failed to read Swift source directory {}: {e}",
                dir.display()
            )
        }) {
            let entry = entry.expect("failed to read Swift source entry");
            let path = entry.path();
            if path.is_dir() {
                collect(&path, sources);
            } else if path.extension().and_then(|extension| extension.to_str()) == Some("swift") {
                sources.push(path);
            }
        }
    }

    let mut sources = Vec::new();
    collect(source_dir, &mut sources);
    sources.sort();
    sources
}

#[cfg(target_os = "macos")]
fn swift_target_triple() -> String {
    let arch = env::var("CARGO_CFG_TARGET_ARCH").expect("missing CARGO_CFG_TARGET_ARCH");
    let arch = match arch.as_str() {
        "aarch64" => "arm64",
        arch => arch,
    };
    let minimum_macos_version =
        env::var("MACOSX_DEPLOYMENT_TARGET").unwrap_or_else(|_| "10.15".to_string());

    format!("{arch}-apple-macosx{minimum_macos_version}")
}

#[cfg(target_os = "macos")]
fn macos_sdk_path() -> Option<PathBuf> {
    xcrun_macos_sdk_path()
        .or_else(|| {
            env::var_os("SDKROOT")
                .filter(|value| !value.is_empty())
                .map(PathBuf::from)
        })
        .or_else(|| parse_isysroot_from_env("CFLAGS"))
        .or_else(|| {
            let target_key = env::var("TARGET")
                .ok()
                .map(|target| format!("CFLAGS_{}", target.replace('-', "_")))?;
            parse_isysroot_from_env(&target_key)
        })
}

#[cfg(target_os = "macos")]
fn parse_isysroot_from_env(key: &str) -> Option<PathBuf> {
    let flags = env::var(key).ok()?;
    let mut parts = flags.split_whitespace();

    while let Some(part) = parts.next() {
        if part == "-isysroot" {
            return parts.next().map(PathBuf::from);
        }

        if let Some(path) = part.strip_prefix("-isysroot") {
            if !path.is_empty() {
                return Some(PathBuf::from(path));
            }
        }
    }

    None
}

#[cfg(target_os = "macos")]
fn xcrun_macos_sdk_path() -> Option<PathBuf> {
    let output = Command::new("/usr/bin/xcrun")
        .env_remove("DEVELOPER_DIR")
        .env_remove("SDKROOT")
        .args(["--sdk", "macosx", "--show-sdk-path"])
        .output()
        .ok()?;

    output
        .status
        .success()
        .then(|| String::from_utf8_lossy(&output.stdout).trim().to_string())
        .filter(|path| !path.is_empty())
        .map(PathBuf::from)
}

#[cfg(target_os = "macos")]
fn link_swift_runtime(target: &str) {
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct SwiftTargetInfo {
        paths: SwiftPaths,
    }

    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct SwiftPaths {
        runtime_library_paths: Vec<String>,
    }

    let output = xcode_tool_command("swiftc")
        .args(["-target", target, "-print-target-info"])
        .output()
        .expect("failed to inspect Swift target info");

    assert!(
        output.status.success(),
        "failed to inspect Swift target info: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let target_info: SwiftTargetInfo =
        serde_json::from_slice(&output.stdout).expect("invalid Swift target info");

    for path in target_info.paths.runtime_library_paths {
        println!("cargo:rustc-link-search=native={path}");
    }

    if let Some(path) = clang_link_search_path() {
        println!("cargo:rustc-link-search={path}");
        println!("cargo:rustc-link-lib=clang_rt.osx");
    }
}

#[cfg(target_os = "macos")]
fn link_macos_sdk_libraries(sdk_path: &Path) {
    println!(
        "cargo:rustc-link-search=native={}",
        sdk_path.join("usr/lib").display()
    );
    println!(
        "cargo:rustc-link-search=native={}",
        sdk_path.join("usr/lib/swift").display()
    );
    println!(
        "cargo:rustc-link-search=framework={}",
        sdk_path.join("System/Library/Frameworks").display()
    );
}

#[cfg(target_os = "macos")]
fn clang_link_search_path() -> Option<String> {
    let clang = env::var_os("SWIFT_RS_CLANG")
        .map(PathBuf::from)
        .or_else(|| xcrun_find_tool("clang"))
        .unwrap_or_else(|| PathBuf::from("clang"));

    let output = Command::new(clang)
        .arg("--print-search-dirs")
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let output = String::from_utf8_lossy(&output.stdout);
    let libraries = output
        .lines()
        .find_map(|line| line.strip_prefix("libraries: ="))?;
    libraries
        .split(':')
        .find(|path| path.ends_with("/lib/darwin"))
        .map(ToString::to_string)
}

#[cfg(target_os = "macos")]
fn xcode_tool_command(tool: &str) -> Command {
    let tool = xcrun_find_tool(tool).unwrap_or_else(|| PathBuf::from(tool));
    let mut command = Command::new(tool);
    command.env_remove("DEVELOPER_DIR").env_remove("SDKROOT");
    command
}

#[cfg(target_os = "macos")]
fn xcrun_find_tool(tool: &str) -> Option<PathBuf> {
    let output = Command::new("/usr/bin/xcrun")
        .env_remove("DEVELOPER_DIR")
        .env_remove("SDKROOT")
        .args(["--find", tool])
        .output()
        .ok()?;

    output
        .status
        .success()
        .then(|| String::from_utf8_lossy(&output.stdout).trim().to_string())
        .filter(|path| !path.is_empty())
        .map(PathBuf::from)
}
