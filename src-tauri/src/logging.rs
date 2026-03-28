// Logging configuration for the application
//
// This module configures tauri-plugin-log with appropriate targets, filters,
// and log levels for development and production builds.

use tauri_plugin_log::{Target, TargetKind, TimezoneStrategy};

// List of crates to exclude from logs to reduce noise
const LOGGING_TARGET_IGNORE_LIST: [&str; 7] = [
    "tauri",
    "sqlx",
    "hyper",
    "h2",
    "tower",
    "cookie_store",
    "reqwest",
];

#[cfg(target_os = "macos")]
pub fn scoped_message(scope: &str, message: &str) -> String {
    format!("[{scope}] {message}")
}

/// Build the configured logging plugin
///
/// Logging targets:
/// - Stdout: Console output for development
/// - LogDir: Persistent log files (chiri.log)
/// - Webview: Browser console for frontend debugging
///
/// Log levels:
/// - Debug builds: Debug level (verbose)
/// - Release builds: Info level (less verbose)
pub fn build_logging_plugin() -> tauri_plugin_log::Builder {
    tauri_plugin_log::Builder::new()
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::LogDir {
                file_name: Some("chiri".to_string()),
            }),
            Target::new(TargetKind::Webview),
        ])
        .filter(|metadata| {
            !LOGGING_TARGET_IGNORE_LIST
                .iter()
                .any(|ignored| metadata.target().starts_with(ignored))
        })
        .format(|out, message, record| {
            let now = TimezoneStrategy::UseLocal.get_now();
            let date = format!(
                "{:04}-{:02}-{:02}",
                now.year(),
                now.month() as u8,
                now.day()
            );
            let time = format!("{:02}:{:02}:{:02}", now.hour(), now.minute(), now.second());

            out.finish(format_args!(
                "[{date}:{time}] [{}] {}",
                record.level(),
                message
            ));
        })
        .level(if cfg!(debug_assertions) {
            log::LevelFilter::Debug
        } else {
            log::LevelFilter::Info
        })
        .max_file_size(50_000)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
}
