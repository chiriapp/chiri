use tauri::Manager;

use crate::utils::fs::copy_dir_recursive;

const IDENTIFIER_MARKER_FILE: &str = ".legacy_migration_v1_done";

fn is_dir_empty_or_only_identifier_marker(path: &std::path::Path) -> std::io::Result<bool> {
    let mut entries = std::fs::read_dir(path)?;
    let Some(entry) = entries.next() else {
        return Ok(true);
    };
    let entry = entry?;
    if entry.file_name() != IDENTIFIER_MARKER_FILE {
        return Ok(false);
    }
    Ok(entries.next().is_none())
}

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
                    || is_dir_empty_or_only_identifier_marker(&app_local_data_dir)
                        .unwrap_or(false));

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
                && (!new_webkit_dir.exists()
                    || crate::utils::fs::is_dir_empty(&new_webkit_dir).unwrap_or(false));

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

#[cfg(test)]
mod tests {
    use super::is_dir_empty_or_only_identifier_marker;
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn temp_dir(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("chiri-name-test-{name}-{nanos}"));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn marker_only_target_counts_as_empty() {
        let dir = temp_dir("marker-only");
        fs::write(dir.join(".legacy_migration_v1_done"), "").unwrap();

        assert!(is_dir_empty_or_only_identifier_marker(&dir).unwrap());

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn marker_plus_user_data_counts_as_populated() {
        let dir = temp_dir("marker-plus-data");
        fs::write(dir.join(".legacy_migration_v1_done"), "").unwrap();
        fs::write(dir.join("chiri.db"), "").unwrap();

        assert!(!is_dir_empty_or_only_identifier_marker(&dir).unwrap());

        fs::remove_dir_all(dir).unwrap();
    }
}
