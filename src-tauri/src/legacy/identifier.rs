use std::path::{Path, PathBuf};
use tauri::Manager;

use crate::utils::fs::{copy_dir_recursive, is_dir_empty};

const OLD_IDENTIFIERS: &[&str] = &["moe.sapphic.Chiri", "moe.sapphic.chiri"];
const MARKER_FILE: &str = ".legacy_migration_v1_done";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum MigrationOutcome {
    Migrated,
    SourceMissing,
    TargetPopulated,
    Failed,
}

#[derive(Default)]
struct MigrationSummary {
    source_found: bool,
    failed: bool,
}

impl MigrationSummary {
    fn record(&mut self, outcome: MigrationOutcome) {
        match outcome {
            MigrationOutcome::Migrated | MigrationOutcome::TargetPopulated => {
                self.source_found = true;
            }
            MigrationOutcome::Failed => {
                self.source_found = true;
                self.failed = true;
            }
            MigrationOutcome::SourceMissing => {}
        }
    }

    fn should_write_marker(&self) -> bool {
        self.source_found && !self.failed
    }
}

/// derive the legacy source path by substituting `old_id` for `new_id` in
/// the Tauri-resolved path. using rfind means we target the rightmost
/// occurrence, the identifier segment, without touching any parent dirs
/// that happen to contain a matching substring
///
/// returns `None` if `new_id` does not appear in the path
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

/// copy `old` to `new` when old exists and new is absent or empty
/// non-destructive: old is left in place as an implicit backup
/// idempotent: a populated target is always skipped
fn migrate_path_pair(label: &str, old: &Path, new: &Path) -> MigrationOutcome {
    log::info!(
        "[Legacy] Evaluating {label}: source={} target={}",
        old.display(),
        new.display()
    );
    log_path_state(&format!("{label} source"), old);
    log_path_state(&format!("{label} target"), new);

    if !old.exists() {
        log::info!("[Legacy] Skipping {label}: source does not exist");
        return MigrationOutcome::SourceMissing;
    }
    if new.exists() && !is_dir_empty(new).unwrap_or(true) {
        log::info!(
            "[Legacy] Skipping {label}: target already populated ({})",
            new.display()
        );
        return MigrationOutcome::TargetPopulated;
    }
    log::info!(
        "[Legacy] Migrating {label}: {} -> {}",
        old.display(),
        new.display()
    );
    if let Err(e) = std::fs::create_dir_all(new) {
        log::warn!("[Legacy] Failed to create target for {label}: {e}");
        return MigrationOutcome::Failed;
    }
    if let Err(e) = copy_dir_recursive(old, new) {
        log::warn!("[Legacy] Failed to copy {label}: {e}");
        MigrationOutcome::Failed
    } else {
        log::info!("[Legacy] {label} migrated successfully");
        log_path_state(&format!("{label} target after copy"), new);
        MigrationOutcome::Migrated
    }
}

fn migrate_path_pair_from_identifiers(
    label: &str,
    new_path: &Path,
    new_identifier: &str,
) -> MigrationOutcome {
    let mut saw_missing = false;

    for old_identifier in OLD_IDENTIFIERS {
        match legacy_path_for(new_path, old_identifier, new_identifier) {
            Some(old_path) if old_path != new_path => {
                let outcome =
                    migrate_path_pair(&format!("{label} ({old_identifier})"), &old_path, new_path);
                match outcome {
                    MigrationOutcome::SourceMissing => saw_missing = true,
                    MigrationOutcome::Migrated
                    | MigrationOutcome::TargetPopulated
                    | MigrationOutcome::Failed => return outcome,
                }
            }
            Some(_) => {
                log::info!(
                    "[Legacy] Skipping {label}: old and new paths resolved identically for {old_identifier}"
                );
            }
            None => {
                log::warn!(
                    "[Legacy] Could not derive old {label} path from new path {} and identifier {}",
                    new_path.display(),
                    new_identifier
                );
            }
        }
    }

    if saw_missing {
        MigrationOutcome::SourceMissing
    } else {
        MigrationOutcome::Failed
    }
}

fn log_path_state(label: &str, path: &Path) {
    match std::fs::metadata(path) {
        Ok(metadata) => {
            log::info!(
                "[Legacy] {label}: exists path={} dir={} file={} size={} readonly={}",
                path.display(),
                metadata.is_dir(),
                metadata.is_file(),
                metadata.len(),
                metadata.permissions().readonly()
            );
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            log::info!("[Legacy] {label}: missing path={}", path.display());
        }
        Err(error) => {
            log::warn!(
                "[Legacy] {label}: could not inspect path={}: {error}",
                path.display()
            );
        }
    }
}

/// migrate app data from the old `moe.sapphic.Chiri` identifier to the
/// current identifier introduced in 0.9.0
///
/// scopes migrated:
/// - `app_local_data_dir`: chiri.db and WebView data
/// - `app_config_dir`: roaming config on Windows; ~/.config/<id> on Linux
/// - `app_log_dir`: log files
/// - `~/Library/WebKit`: WebKit storage on macOS only
///
/// migration is non-destructive and runs at most once, gated by a marker file
pub fn migrate_identifier<R: tauri::Runtime>(app: &tauri::App<R>) {
    let new_identifier = app.config().identifier.clone();

    let marker_path = app
        .path()
        .app_local_data_dir()
        .ok()
        .map(|d| d.join(MARKER_FILE));
    if let Some(marker) = &marker_path {
        log::info!(
            "[Legacy] Identifier migration marker path: {}",
            marker.display()
        );
    } else {
        log::warn!("[Legacy] Could not resolve identifier migration marker path");
    }
    if marker_path.as_deref().map(|p| p.exists()).unwrap_or(false) {
        log::info!("[Legacy] Identifier migration marker exists; skipping identifier migration");
        return;
    }

    log::info!("[Legacy] Checking for old identifier data...");

    let path = app.path();
    let mut summary = MigrationSummary::default();

    let scopes: &[(&str, Result<PathBuf, _>)] = &[
        ("app data", path.app_local_data_dir()),
        ("app config", path.app_config_dir()),
        ("app logs", path.app_log_dir()),
    ];

    for (label, resolved) in scopes {
        match resolved {
            Ok(new_path) => {
                summary.record(migrate_path_pair_from_identifiers(
                    label,
                    new_path,
                    &new_identifier,
                ));
            }
            Err(e) => {
                log::warn!("[Legacy] Could not resolve {label} path: {e}");
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Some(home) = dirs::home_dir() {
            let webkit_base = home.join("Library/WebKit");
            let new_webkit = webkit_base.join(&new_identifier);

            for subdir in &["WebsiteData/LocalStorage", "WebsiteData/IndexedDB"] {
                let new_sub = new_webkit.join(subdir);
                for old_identifier in OLD_IDENTIFIERS {
                    let old_sub = webkit_base.join(old_identifier).join(subdir);
                    let outcome = migrate_path_pair(
                        &format!("WebKit/{subdir} ({old_identifier})"),
                        &old_sub,
                        &new_sub,
                    );
                    summary.record(outcome);
                    if outcome != MigrationOutcome::SourceMissing {
                        break;
                    }
                }
            }
        }
    }

    if !summary.should_write_marker() {
        if summary.failed {
            log::warn!("[Legacy] Identifier migration failed; marker will not be written");
        } else {
            log::info!("[Legacy] No old identifier data found; marker will not be written");
        }
    } else if let Some(marker) = marker_path {
        if let Err(e) = std::fs::create_dir_all(marker.parent().unwrap_or(&marker)) {
            log::warn!("[Legacy] Could not create data dir for marker: {e}");
        } else if let Err(e) = std::fs::write(&marker, "") {
            log::warn!("[Legacy] Could not write migration marker: {e}");
        } else {
            log::info!(
                "[Legacy] Identifier migration marker written: {}",
                marker.display()
            );
        }
    }

    log::info!("[Legacy] Identifier migration done.");
}

#[cfg(test)]
mod tests {
    use super::{migrate_path_pair, MigrationOutcome, MigrationSummary};
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
        let path = std::env::temp_dir().join(format!("chiri-identifier-test-{name}-{nanos}"));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn missing_sources_do_not_trigger_marker() {
        let mut summary = MigrationSummary::default();
        summary.record(MigrationOutcome::SourceMissing);

        assert!(!summary.should_write_marker());
    }

    #[test]
    fn failed_copy_prevents_marker() {
        let mut summary = MigrationSummary::default();
        summary.record(MigrationOutcome::Migrated);
        summary.record(MigrationOutcome::Failed);

        assert!(!summary.should_write_marker());
    }

    #[test]
    fn populated_target_is_safe_to_mark_done() {
        let mut summary = MigrationSummary::default();
        summary.record(MigrationOutcome::TargetPopulated);

        assert!(summary.should_write_marker());
    }

    #[test]
    fn path_pair_copies_missing_target() {
        let root = temp_dir("copy");
        let old = root.join("old");
        let new = root.join("new");
        fs::create_dir_all(&old).unwrap();
        fs::write(old.join("chiri.db"), "db").unwrap();

        assert_eq!(
            migrate_path_pair("test", &old, &new),
            MigrationOutcome::Migrated
        );
        assert_eq!(fs::read_to_string(new.join("chiri.db")).unwrap(), "db");

        fs::remove_dir_all(root).unwrap();
    }
}
