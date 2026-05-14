use std::path::{Path, PathBuf};
use tauri::Manager;

fn is_dir_empty(path: &Path) -> bool {
    std::fs::read_dir(path)
        .ok()
        .map(|mut entries| entries.next().is_none())
        .unwrap_or(true)
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        std::fs::create_dir_all(dst)?;
    }
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

/// Derive the legacy source path by substituting `old_id` for `new_id` in
/// the Tauri-resolved path.  Using rfind means we target the rightmost
/// occurrence — the identifier segment — without touching any parent dirs
/// that happen to contain a matching substring.
///
/// Returns `None` if `new_id` does not appear in the path (shouldn't happen
/// for well-formed Tauri paths, but better to skip than to corrupt data).
fn legacy_path_for(new: &Path, old_id: &str, new_id: &str) -> Option<PathBuf> {
    let s = new.to_str()?;
    let pos = s.rfind(new_id)?;
    Some(PathBuf::from(format!(
        "{}{}{}",
        &s[..pos],
        old_id,
        &s[pos + new_id.len()..]
    )))
}

/// Copy `old` → `new` when old exists and new is absent or empty.
/// Non-destructive: old is left in place as an implicit backup.
/// Idempotent: a populated target is always skipped.
fn migrate_path_pair(label: &str, old: &Path, new: &Path) {
    if !old.exists() {
        return;
    }
    if new.exists() && !is_dir_empty(new) {
        log::debug!(
            "[LegacyMigration] Skipping {label}: target already populated ({})",
            new.display()
        );
        return;
    }
    log::info!(
        "[LegacyMigration] Migrating {label}: {} → {}",
        old.display(),
        new.display()
    );
    if let Err(e) = std::fs::create_dir_all(new) {
        log::warn!("[LegacyMigration] Failed to create target for {label}: {e}");
        return;
    }
    if let Err(e) = copy_dir_recursive(old, new) {
        log::warn!("[LegacyMigration] Failed to copy {label}: {e}");
    } else {
        log::info!("[LegacyMigration] {label} migrated successfully");
    }
}

/// Migrate app data from the legacy `moe.sapphic.Chiri` identifier to the
/// new identifier introduced in 0.9.0.
///
/// Scopes migrated:
/// - `app_local_data_dir` — chiri.db and WebView data (all platforms)
/// - `app_config_dir`     — roaming config on Windows; ~/.config/<id> on Linux;
///                          same as data on macOS so the guard naturally skips it
/// - `app_log_dir`        — log files (all platforms)
/// - `~/Library/WebKit`   — WebKit storage (macOS only; separate from App Support)
///
/// Migration is non-destructive (copy, not move) and idempotent.
pub fn migrate_from_legacy_identifier<R: tauri::Runtime>(app: &tauri::App<R>) {
    const OLD_IDENTIFIER: &str = "moe.sapphic.Chiri";
    let new_identifier = app.config().identifier.clone();

    log::info!("[LegacyMigration] Checking for legacy {OLD_IDENTIFIER} data…");

    let path = app.path();

    let scopes: &[(&str, Result<PathBuf, _>)] = &[
        ("app data", path.app_local_data_dir()),
        ("app config", path.app_config_dir()),
        ("app logs", path.app_log_dir()),
    ];

    for (label, resolved) in scopes {
        match resolved {
            Ok(new_path) => {
                match legacy_path_for(new_path, OLD_IDENTIFIER, &new_identifier) {
                    Some(old_path) if old_path != *new_path => {
                        migrate_path_pair(label, &old_path, new_path);
                    }
                    _ => {}
                }
            }
            Err(e) => {
                log::warn!("[LegacyMigration] Could not resolve {label} path: {e}");
            }
        }
    }

    // macOS: WebKit storage lives in ~/Library/WebKit/<identifier>/, completely
    // separate from Application Support.
    //
    // WKWebView creates the new identifier's WebKit directory before setup()
    // runs, so the standard is_dir_empty guard on the whole dir fires
    // immediately and skips migration.  Migrate the individual data
    // subdirectories instead — LocalStorage/ and IndexedDB/ will be absent or
    // empty in the freshly-initialised dir even though the parent already exists.
    #[cfg(target_os = "macos")]
    {
        if let Some(home) = dirs::home_dir() {
            let webkit_base = home.join("Library/WebKit");
            let old_webkit = webkit_base.join(OLD_IDENTIFIER);
            let new_webkit = webkit_base.join(&new_identifier);

            for subdir in &["LocalStorage", "IndexedDB"] {
                let old_sub = old_webkit.join(subdir);
                let new_sub = new_webkit.join(subdir);
                if old_sub.exists() {
                    migrate_path_pair(
                        &format!("WebKit/{subdir}"),
                        &old_sub,
                        &new_sub,
                    );
                }
            }
        }
    }

    log::info!("[LegacyMigration] Done.");
}
