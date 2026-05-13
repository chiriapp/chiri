use std::path::Path;
use tauri::Manager;

/// Recursively copy a directory and its contents
fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    use std::fs;

    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if ty.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }

    Ok(())
}

/// Migrate data from caldav-tasks to chiri
///
/// This includes:
/// - App data directory (database + localStorage/WebView data)
/// - Renaming caldav-tasks.db to chiri.db
/// - On macOS: WebKit directory (separate from app data)
pub fn migrate_from_caldav_tasks<R: tauri::Runtime>(app: &tauri::App<R>) {
    let old_dir_name = "caldav-tasks";
    let old_db_name = "caldav-tasks.db";
    let new_db_name = "chiri.db";

    // Migrate main app data directory
    if let Some(app_local_data_dir) = app.path().app_local_data_dir().ok() {
        if let Some(parent_dir) = app_local_data_dir.parent() {
            let old_app_dir = parent_dir.join(old_dir_name);

            // Only migrate if old directory exists and new one doesn't (or is empty)
            let should_migrate = old_app_dir.exists()
                && (!app_local_data_dir.exists()
                    || std::fs::read_dir(&app_local_data_dir)
                        .ok()
                        .map(|mut entries| entries.next().is_none())
                        .unwrap_or(false));

            if should_migrate {
                log::info!(
                    "[DataMigration] Migrating app data: {} → {}",
                    old_app_dir.display(),
                    app_local_data_dir.display()
                );

                if let Err(e) = std::fs::create_dir_all(&app_local_data_dir) {
                    log::warn!("[DataMigration] Failed to create new app directory: {e}");
                } else if let Err(e) = copy_dir_recursive(&old_app_dir, &app_local_data_dir) {
                    log::warn!("[DataMigration] Failed to migrate app data: {e}");
                } else {
                    log::info!("[DataMigration] App data migrated successfully");

                    // Rename the database file if it exists
                    let old_db_path = app_local_data_dir.join(old_db_name);
                    let new_db_path = app_local_data_dir.join(new_db_name);

                    if old_db_path.exists() {
                        if let Err(e) = std::fs::rename(&old_db_path, &new_db_path) {
                            log::warn!(
                                "[DataMigration] Failed to rename database from {} to {}: {e}",
                                old_db_path.display(),
                                new_db_path.display(),
                            );
                        } else {
                            log::info!("[DataMigration] Database renamed to {new_db_name}");
                        }
                    }
                }
            }
        }
    }

    // Migrate WebKit/WebView data (macOS only - uses different location)
    #[cfg(target_os = "macos")]
    {
        if let Some(home_dir) = dirs::home_dir() {
            let old_webkit_dir = home_dir.join("Library/WebKit").join(old_dir_name);
            let new_webkit_dir = home_dir
                .join("Library/WebKit")
                .join(&app.config().identifier);

            let should_migrate = old_webkit_dir.exists()
                && (!new_webkit_dir.exists()
                    || std::fs::read_dir(&new_webkit_dir)
                        .ok()
                        .map(|mut entries| entries.next().is_none())
                        .unwrap_or(false));

            if should_migrate {
                log::info!(
                    "[DataMigration] Migrating WebKit data: {} → {}",
                    old_webkit_dir.display(),
                    new_webkit_dir.display()
                );

                if let Err(e) = std::fs::create_dir_all(&new_webkit_dir) {
                    log::warn!("[DataMigration] Failed to create new WebKit directory: {e}");
                } else if let Err(e) = copy_dir_recursive(&old_webkit_dir, &new_webkit_dir) {
                    log::warn!("[DataMigration] Failed to migrate WebKit data: {e}");
                } else {
                    log::info!("[DataMigration] WebKit data migrated successfully");
                }
            }
        }
    }
}
