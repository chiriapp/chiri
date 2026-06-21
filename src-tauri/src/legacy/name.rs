use tauri::Manager;

use crate::utils::fs::{copy_dir_recursive, is_dir_empty};

/// migrate data from caldav-tasks to Chiri
///
/// this includes:
/// - app data directory (database + localStorage/WebView data)
/// - renaming caldav-tasks.db to chiri.db
/// - on macOS: WebKit directory (separate from app data)
pub fn migrate_name<R: tauri::Runtime>(app: &tauri::App<R>) {
    let old_dir_name = "caldav-tasks";
    let old_db_name = "caldav-tasks.db";
    let new_db_name = "chiri.db";

    // migrate main app data directory
    if let Ok(app_local_data_dir) = app.path().app_local_data_dir() {
        if let Some(parent_dir) = app_local_data_dir.parent() {
            let old_app_dir = parent_dir.join(old_dir_name);

            // only migrate if old directory exists and new one doesn't (or is empty)
            let should_migrate = old_app_dir.exists()
                && (!app_local_data_dir.exists()
                    || is_dir_empty(&app_local_data_dir).unwrap_or(false));

            if should_migrate {
                log::info!(
                    "[Legacy] Migrating app data: {} -> {}",
                    old_app_dir.display(),
                    app_local_data_dir.display()
                );

                if let Err(e) = std::fs::create_dir_all(&app_local_data_dir) {
                    log::warn!("[Legacy] Failed to create new app directory: {e}");
                } else if let Err(e) = copy_dir_recursive(&old_app_dir, &app_local_data_dir) {
                    log::warn!("[Legacy] Failed to migrate app data: {e}");
                } else {
                    log::info!("[Legacy] App data migrated successfully");

                    let old_db_path = app_local_data_dir.join(old_db_name);
                    let new_db_path = app_local_data_dir.join(new_db_name);

                    if old_db_path.exists() {
                        if let Err(e) = std::fs::rename(&old_db_path, &new_db_path) {
                            log::warn!(
                                "[Legacy] Failed to rename database from {} to {}: {e}",
                                old_db_path.display(),
                                new_db_path.display(),
                            );
                        } else {
                            log::info!("[Legacy] Database renamed to {new_db_name}");
                        }
                    }
                }
            }
        }
    }

    // migrate WebKit/WebView data (macOS only - uses different location)
    #[cfg(target_os = "macos")]
    {
        if let Some(home_dir) = dirs::home_dir() {
            let old_webkit_dir = home_dir.join("Library/WebKit").join(old_dir_name);
            let new_webkit_dir = home_dir
                .join("Library/WebKit")
                .join(&app.config().identifier);

            let should_migrate = old_webkit_dir.exists()
                && (!new_webkit_dir.exists() || is_dir_empty(&new_webkit_dir).unwrap_or(false));

            if should_migrate {
                log::info!(
                    "[Legacy] Migrating WebKit data: {} -> {}",
                    old_webkit_dir.display(),
                    new_webkit_dir.display()
                );

                if let Err(e) = std::fs::create_dir_all(&new_webkit_dir) {
                    log::warn!("[Legacy] Failed to create new WebKit directory: {e}");
                } else if let Err(e) = copy_dir_recursive(&old_webkit_dir, &new_webkit_dir) {
                    log::warn!("[Legacy] Failed to migrate WebKit data: {e}");
                } else {
                    log::info!("[Legacy] WebKit data migrated successfully");
                }
            }
        }
    }
}
