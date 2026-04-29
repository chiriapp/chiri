pub mod manager;
pub mod permissions;

#[cfg(target_os = "linux")]
mod linux;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "windows")]
mod windows;

pub use manager::NotificationManagerState;

#[cfg(target_os = "windows")]
pub use windows::ensure_notification_icon;
