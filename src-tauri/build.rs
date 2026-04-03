#[cfg(target_os = "macos")]
mod liquid_glass_icon;

fn main() {
    tauri_build::build();

    // Compile macOS Liquid Glass icon
    #[cfg(target_os = "macos")]
    {
        liquid_glass_icon::compile_icon();
        compile_swift_notifications();
    }
}

#[cfg(target_os = "macos")]
fn compile_swift_notifications() {
    use std::process::Command;

    let project_root = env!("CARGO_MANIFEST_DIR");
    let objc_source = format!("{}/src/notifications.m", project_root);
    let out_dir = std::env::var("OUT_DIR").expect("OUT_DIR is not set");
    let output_lib = format!("{}/libnotifications.a", out_dir);
    let obj_file = format!("{}/notifications.o", out_dir);

    // Recompile if Objective-C source changes
    println!("cargo:rerun-if-changed={}", objc_source);

    // Link against UserNotifications framework
    println!("cargo:rustc-link-lib=framework=UserNotifications");
    println!("cargo:rustc-link-lib=framework=Foundation");

    // Compile Objective-C code to object file
    let compile_output = Command::new("clang")
        .args([
            "-c",
            "-fmodules",
            "-fobjc-arc",
            "-Wno-unguarded-availability-new", // We use runtime checks instead
            &objc_source,
            "-o",
            &obj_file,
        ])
        .output();

    match compile_output {
        Ok(output) => {
            if !output.status.success() {
                eprintln!("clang stderr: {}", String::from_utf8_lossy(&output.stderr));
                panic!("Failed to compile Objective-C notification code");
            } else {
                println!("Objective-C notification code compiled successfully");
            }
        }
        Err(e) => {
            eprintln!("Failed to run clang: {}", e);
            panic!("clang not available");
        }
    }

    // Create static library from object file
    let ar_output = Command::new("ar")
        .args(["rcs", &output_lib, &obj_file])
        .output();

    match ar_output {
        Ok(output) => {
            if !output.status.success() {
                eprintln!("ar stderr: {}", String::from_utf8_lossy(&output.stderr));
                panic!("Failed to create static library");
            } else {
                println!("Static library created successfully");
            }
        }
        Err(e) => {
            eprintln!("Failed to run ar: {}", e);
            panic!("ar not available");
        }
    }

    // Link the static library from Cargo's writable build output directory.
    println!("cargo:rustc-link-search=native={}", out_dir);
    println!("cargo:rustc-link-lib=static=notifications");
}
