use std::{fmt::Arguments, io::IsTerminal};

use log::Record;
use tauri_plugin_log::{fern::FormatCallback, Target, TargetKind, TimezoneStrategy};

// list of crates to exclude from logs to reduce noise
const LOGGING_TARGET_IGNORE_LIST: [&str; 11] = [
    "tauri",
    "sqlx",
    "hyper",
    "h2",
    "tower",
    "cookie_store",
    "reqwest",
    "zbus",
    "html5ever",
    "ammonia",
    "user_notify::platform_impl::mock",
];

const LOGGING_MESSAGE_PREFIX_IGNORE_LIST: [&str; 4] = [
    "read_command",
    "read_commands",
    "write_command",
    "write_commands",
];

fn should_ignore_message(message: &str) -> bool {
    LOGGING_MESSAGE_PREFIX_IGNORE_LIST
        .iter()
        .any(|ignored| message.starts_with(ignored))
}

fn write_line(out: FormatCallback, message: &Arguments, record: &Record, timestamps: bool) {
    let message = message.to_string();

    if should_ignore_message(&message) {
        return;
    }

    let level = record.level();

    if timestamps {
        let now = TimezoneStrategy::UseLocal.get_now();
        out.finish(format_args!(
            "[{:04}-{:02}-{:02}:{:02}:{:02}:{:02}] [{level}] {message}",
            now.year(),
            now.month() as u8,
            now.day(),
            now.hour(),
            now.minute(),
            now.second()
        ));
    } else {
        out.finish(format_args!("[{level}] {message}"));
    }
}

#[cfg(target_os = "macos")]
pub fn scoped_message(scope: &str, message: &str) -> String {
    format!("[{scope}] {message}")
}

pub fn build_logging_plugin() -> tauri_plugin_log::Builder {
    let stdout_timestamps = !std::io::stdout().is_terminal();

    tauri_plugin_log::Builder::new()
        .format(|out, message, _| out.finish(format_args!("{message}")))
        .targets([
            Target::new(TargetKind::Stdout).format(move |out, message, record| {
                write_line(out, message, record, stdout_timestamps)
            }),
            Target::new(TargetKind::LogDir {
                file_name: Some("chiri".to_string()),
            })
            .format(|out, message, record| write_line(out, message, record, true)),
        ])
        .filter(|metadata| {
            !LOGGING_TARGET_IGNORE_LIST
                .iter()
                .any(|ignored| metadata.target().starts_with(ignored))
        })
        .level(if cfg!(debug_assertions) {
            log::LevelFilter::Debug
        } else {
            log::LevelFilter::Info
        })
        .max_file_size(50_000)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
}
