/// macOS Liquid Glass icon compilation
///
/// This module handles compiling the .icon format to Assets.car using Apple's actool.
/// The Liquid Glass icon system supports appearance variants (Default, Dark, Tinted)
/// and is new in macOS 26 Tahoe.
///
/// Reference:
/// - https://developer.apple.com/documentation/xcode/configuring-your-app-icon-for-macos
use std::process::Command;

fn has_precompiled_assets(gen_dir: &str) -> bool {
    let assets_car = format!("{}/Assets.car", gen_dir);
    let partial_plist = format!("{}/partial.plist", gen_dir);
    let chiri_icns = format!("{}/Chiri.icns", gen_dir);

    std::path::Path::new(&assets_car).exists()
        && std::path::Path::new(&partial_plist).exists()
        && std::path::Path::new(&chiri_icns).exists()
}

pub fn compile_icon() {
    let project_root = env!("CARGO_MANIFEST_DIR");
    let icon_source = format!("{}/icons/Chiri.icon", project_root);
    let gen_dir = format!("{}/gen", project_root);

    // Create gen directory if it doesn't exist
    std::fs::create_dir_all(&gen_dir).expect("Failed to create gen directory");

    if std::path::Path::new(&icon_source).exists() {
        println!("cargo:rerun-if-changed={}", icon_source);
        println!("cargo:rerun-if-changed={}/icon.json", icon_source);
        println!("cargo:rerun-if-changed={}/Assets", icon_source);

        let partial_plist = format!("{}/partial.plist", gen_dir);
        let actool_args = [
            "--compile",
            gen_dir.as_str(),
            "--output-format",
            "human-readable-text",
            "--output-partial-info-plist",
            partial_plist.as_str(),
            "--app-icon",
            "Chiri",
            "--include-all-app-icons",
            "--target-device",
            "mac",
            "--minimum-deployment-target",
            "26.0",
            "--platform",
            "macosx",
            icon_source.as_str(),
        ];

        // Prefer actool from PATH (Nix/native), then fall back to xcrun actool.
        let output = Command::new("actool")
            .args(actool_args)
            .output()
            .or_else(|_| {
                Command::new("xcrun")
                    .arg("actool")
                    .args(actool_args)
                    .output()
            });

        match output {
            Ok(output) => {
                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    let stdout = String::from_utf8_lossy(&output.stdout);

                    eprintln!("actool stderr: {}", stderr);
                    eprintln!("actool stdout: {}", stdout);

                    if has_precompiled_assets(&gen_dir) {
                        println!(
                            "cargo:warning=actool failed; using pre-generated icon assets in {}",
                            gen_dir
                        );
                        return;
                    }

                    panic!("actool failed to compile icon");
                }
                println!("Successfully compiled icon to {}", gen_dir);
            }
            Err(e) => {
                if has_precompiled_assets(&gen_dir) {
                    println!(
                        "cargo:warning=Failed to execute actool ({}); using pre-generated icon assets in {}",
                        e, gen_dir
                    );
                    return;
                }

                eprintln!("Failed to execute actool: {}", e);
                eprintln!("Make sure you have Xcode Command Line Tools installed");
                panic!("Icon compilation failed");
            }
        }
    } else {
        println!(
            "cargo:warning=Icon source not found at {}, skipping icon compilation",
            icon_source
        );
    }
}
