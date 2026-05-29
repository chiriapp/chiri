#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod app;
mod http;
mod install;
mod legacy;
mod linux;
mod logging;
mod macos;
mod notifications;
mod preferences;
mod schema;
mod tray;
mod utils;
mod window;

fn main() {
    app::run();
}
