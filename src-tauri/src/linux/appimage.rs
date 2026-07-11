// AppImage desktop integration helpers
//
// when running as an AppImage, the binary is not installed through the normal
// package manager, so the desktop file and icon theme entry are missing. this
// module installs the bundled icon silently and offers an opt-in desktop file
// install for users who want launcher integration.

#[cfg(target_os = "linux")]
use serde::{Deserialize, Serialize};
#[cfg(target_os = "linux")]
use std::ffi::OsStr;
#[cfg(target_os = "linux")]
use std::path::{Path, PathBuf};
#[cfg(target_os = "linux")]
use tauri::Manager;

/// persistent user choice for AppImage desktop integration
#[cfg(target_os = "linux")]
#[derive(Debug, Default, Serialize, Deserialize)]
struct IntegrationState {
    #[serde(default)]
    prompted: bool,
    #[serde(default)]
    integrated: bool,
    #[serde(default)]
    skipped: bool,
}

/// installs the bundled AppImage icon into the user's hicolor icon theme
///
/// this is a best-effort operation; failures are logged but never block startup.
/// it is skipped when an external integration tool (e.g. AppImageLauncher) has
/// taken responsibility for desktop integration, signaled by $DESKTOPINTEGRATION
/// or the AppImage opt-out files.
#[cfg(target_os = "linux")]
pub fn install_icon_for_appimage() {
    if !is_running_as_appimage() {
        return;
    }

    if should_skip_install() {
        log::info!("[AppImage] External integration tool detected; skipping icon install");
        return;
    }

    let Some(app_dir) = app_dir() else {
        log::warn!("[AppImage] APPDIR not set; cannot install icon");
        return;
    };

    let Some(home_dir) = dirs::home_dir() else {
        log::warn!("[AppImage] Home directory not found; cannot install icon");
        return;
    };

    let target = home_dir.join(".local/share/icons/hicolor");

    let hicolor_source = app_dir.join("usr/share/icons/hicolor");
    if hicolor_source.exists() {
        if let Err(e) = copy_icons(&hicolor_source, &target) {
            log::warn!("[AppImage] Failed to copy hicolor icons: {e}");
        }
    } else {
        // Tauri sometimes puts the icon at the AppDir root instead of inside
        // usr/share/icons/hicolor. fall back to copying the root icon.
        let icon_name = icon_name_from_desktop_file(&app_dir)
            .unwrap_or_else(|| "garden.chiri.Chiri".to_string());
        if let Err(e) = copy_root_icon(&app_dir, &target, &icon_name) {
            log::warn!("[AppImage] Failed to copy root icon: {e}");
        }
    }

    refresh_icon_cache(&target);
}

#[cfg(target_os = "linux")]
fn is_running_as_appimage() -> bool {
    std::env::var_os("APPIMAGE").is_some()
}

/// returns true when an external integration tool has taken responsibility for
/// installing icons, .desktop files, etc. per the AppImage spec. this checks
/// the opt-out files and the $DESKTOPINTEGRATION environment variable set by
/// AppImageLauncher; it does not probe for running daemons.
#[cfg(target_os = "linux")]
fn should_skip_install() -> bool {
    // $DESKTOPINTEGRATION is set by AppImageLauncher when it handles integration
    if std::env::var_os("DESKTOPINTEGRATION").is_some() {
        return true;
    }

    // user-level opt-out file
    let home_opt_out = dirs::home_dir().map(|d| d.join(".local/share/appimagekit/nointegrate"));
    if home_opt_out.is_some_and(|p| p.exists()) {
        return true;
    }

    // AppImage-level opt-out file (APPIMAGE path with .home or .config suffix)
    if let Some(appimage) = std::env::var_os("APPIMAGE") {
        let appimage_path = PathBuf::from(appimage);
        let home_marker = appimage_path.with_extension("home");
        let config_marker = appimage_path.with_extension("config");
        if home_marker.exists() || config_marker.exists() {
            return true;
        }
    }

    false
}

#[cfg(target_os = "linux")]
fn app_dir() -> Option<PathBuf> {
    std::env::var_os("APPDIR").map(PathBuf::from)
}

/// copies all PNG icons from `source/hicolor/<size>/apps/` into the matching
/// target directories under `~/.local/share/icons/hicolor/<size>/apps/`.
#[cfg(target_os = "linux")]
fn copy_icons(source: &Path, target: &Path) -> Result<(), std::io::Error> {
    if !source.exists() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "source icon directory not found in AppImage",
        ));
    }

    for size_entry in std::fs::read_dir(source)? {
        let size_entry = size_entry?;
        let source_size_dir = size_entry.path();
        let Some(size_name) = source_size_dir.file_name().and_then(|n| n.to_str()) else {
            continue;
        };

        let source_apps_dir = source_size_dir.join("apps");
        if !source_apps_dir.exists() {
            continue;
        }

        let target_apps_dir = target.join(size_name).join("apps");
        std::fs::create_dir_all(&target_apps_dir)?;

        for icon_entry in std::fs::read_dir(&source_apps_dir)? {
            let icon_entry = icon_entry?;
            let source_icon = icon_entry.path();
            let Some(icon_name) = source_icon.file_name() else {
                continue;
            };
            let target_icon = target_apps_dir.join(icon_name);
            std::fs::copy(&source_icon, &target_icon)?;
        }
    }

    Ok(())
}

/// reads the AppDir's root desktop file and returns the value of its `Icon=` entry
#[cfg(target_os = "linux")]
fn icon_name_from_desktop_file(app_dir: &Path) -> Option<String> {
    // the AppImage spec allows exactly one .desktop file in the AppDir root
    let desktop_file = std::fs::read_dir(app_dir)
        .ok()?
        .filter_map(|e| e.ok().map(|e| e.path()))
        .find(|p| p.extension().is_some_and(|ext| ext == "desktop"))?;

    let content = std::fs::read_to_string(desktop_file).ok()?;
    for line in content.lines() {
        if let Some(value) = line.strip_prefix("Icon=") {
            return Some(value.to_string());
        }
    }
    None
}

/// copies the AppDir root icon into the user's hicolor theme.
/// Tauri sometimes places the icon at the root (e.g. `garden.chiri.Chiri.png`)
/// rather than under `usr/share/icons/hicolor`. prefer SVG, then PNG, then
/// `.DirIcon`.
#[cfg(target_os = "linux")]
fn copy_root_icon(
    app_dir: &Path,
    target_theme_dir: &Path,
    icon_name: &str,
) -> Result<(), std::io::Error> {
    let candidates: [(Option<PathBuf>, &str); 3] = [
        (Some(app_dir.join(format!("{icon_name}.svg"))), "scalable"),
        (Some(app_dir.join(format!("{icon_name}.png"))), "256x256"),
        (Some(app_dir.join(".DirIcon")), "256x256"),
    ];

    for (source, size_dir) in candidates {
        let Some(source) = source else { continue };
        if !source.exists() {
            continue;
        }

        let ext = source.extension().and_then(|e| e.to_str()).unwrap_or("png");
        let target_icon_name = if source.file_name() == Some(OsStr::new(".DirIcon")) {
            format!("{icon_name}.{ext}")
        } else {
            source
                .file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.to_string())
                .unwrap_or_else(|| format!("{icon_name}.{ext}"))
        };

        let target_dir = target_theme_dir.join(size_dir).join("apps");
        std::fs::create_dir_all(&target_dir)?;
        let target = target_dir.join(target_icon_name);
        std::fs::copy(&source, &target)?;
        log::info!(
            "[AppImage] Installed root icon: {} -> {}",
            source.display(),
            target.display()
        );
        return Ok(());
    }

    Err(std::io::Error::new(
        std::io::ErrorKind::NotFound,
        "no root icon found in AppImage",
    ))
}

/// refreshes the hicolor icon cache so installed icons become visible immediately
#[cfg(target_os = "linux")]
fn refresh_icon_cache(theme_dir: &Path) {
    let commands = ["gtk4-update-icon-cache", "gtk-update-icon-cache"];
    for cmd in commands {
        match std::process::Command::new(cmd)
            .args([OsStr::new("-f"), OsStr::new("-t"), theme_dir.as_os_str()])
            .status()
        {
            Ok(status) if status.success() => {
                log::info!("[AppImage] Refreshed icon cache with {cmd}");
                return;
            }
            Ok(status) => {
                log::debug!("[AppImage] {cmd} exited with {status}");
            }
            Err(e) => {
                log::debug!("[AppImage] {cmd} not available: {e}");
            }
        }
    }
}

/// Tauri command: returns true when the AppImage desktop integration prompt
/// should be shown. it is shown once unless the user integrates or skips it.
#[cfg(target_os = "linux")]
#[tauri::command]
pub fn is_appimage_desktop_integration_needed(app_handle: tauri::AppHandle) -> bool {
    if !is_running_as_appimage() {
        return false;
    }

    if should_skip_install() {
        return false;
    }

    let Some(data_dir) = app_data_dir(&app_handle) else {
        return false;
    };

    let state = load_state(&data_dir);
    !state.prompted && !state.integrated && !state.skipped
}

/// Tauri command: returns true when the AppImage desktop file is installed
#[cfg(target_os = "linux")]
#[tauri::command]
pub fn is_appimage_desktop_file_installed() -> bool {
    let Some(home_dir) = dirs::home_dir() else {
        return false;
    };

    let desktop_file = home_dir
        .join(".local/share/applications")
        .join("garden.chiri.Chiri.desktop");
    desktop_file.exists()
}

/// Tauri command: install the AppImage desktop file and refresh caches
#[cfg(target_os = "linux")]
#[tauri::command]
pub fn install_appimage_desktop_integration(app_handle: tauri::AppHandle) -> Result<(), String> {
    if !is_running_as_appimage() {
        return Err(
            "AppImage desktop integration is only available when running as an AppImage"
                .to_string(),
        );
    }

    let Some(app_dir) = app_dir() else {
        return Err("APPDIR not set".to_string());
    };

    let appimage_path = std::env::var_os("APPIMAGE")
        .map(PathBuf::from)
        .ok_or_else(|| "APPIMAGE not set".to_string())?;

    // per AppImage convention, integration moves the AppImage to ~/Applications so
    // the launcher stays valid and the file is easy to find later.
    let appimage_path = match move_appimage_to_applications(&appimage_path) {
        Ok(new_path) => new_path,
        Err(e) => {
            log::warn!("[AppImage] Failed to move AppImage to ~/Applications: {e}");
            appimage_path
        }
    };

    install_desktop_file(&app_dir, &appimage_path)
        .map_err(|e| format!("failed to install desktop file: {e}"))?;

    install_icon_for_appimage();

    if let Some(data_dir) = app_data_dir(&app_handle) {
        let mut state = load_state(&data_dir);
        state.prompted = true;
        state.integrated = true;
        state.skipped = false;
        save_state(&data_dir, &state);
    }

    Ok(())
}

/// Tauri command: decline the desktop integration prompt
#[cfg(target_os = "linux")]
#[tauri::command]
pub fn skip_appimage_desktop_integration(app_handle: tauri::AppHandle) {
    if let Some(data_dir) = app_data_dir(&app_handle) {
        let mut state = load_state(&data_dir);
        state.prompted = true;
        state.skipped = true;
        save_state(&data_dir, &state);
    }
}

/// Tauri command: remove the installed AppImage desktop file
#[cfg(target_os = "linux")]
#[tauri::command]
pub fn remove_appimage_desktop_integration(app_handle: tauri::AppHandle) -> Result<(), String> {
    let Some(home_dir) = dirs::home_dir() else {
        return Err("home directory not found".to_string());
    };

    let desktop_file = home_dir
        .join(".local/share/applications")
        .join("garden.chiri.Chiri.desktop");

    if desktop_file.exists() {
        std::fs::remove_file(&desktop_file)
            .map_err(|e| format!("failed to remove desktop file: {e}"))?;
    }

    refresh_applications_cache();

    if let Some(data_dir) = app_data_dir(&app_handle) {
        let mut state = load_state(&data_dir);
        state.integrated = false;
        save_state(&data_dir, &state);
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn applications_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|d| d.join("Applications"))
}

/// moves an AppImage into ~/Applications per the AppImage integration convention.
/// if the source and target are on different filesystems, falls back to copy+remove.
#[cfg(target_os = "linux")]
fn move_appimage_to_applications(appimage_path: &Path) -> Result<PathBuf, std::io::Error> {
    let Some(filename) = appimage_path.file_name() else {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "AppImage path has no filename",
        ));
    };
    let Some(applications_dir) = applications_dir() else {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "home directory not found",
        ));
    };
    std::fs::create_dir_all(&applications_dir)?;
    let target = applications_dir.join(filename);

    if appimage_path == target {
        return Ok(target);
    }

    match std::fs::rename(appimage_path, &target) {
        Ok(()) => Ok(target),
        Err(_) => {
            std::fs::copy(appimage_path, &target)?;
            let _ = std::fs::remove_file(appimage_path);
            Ok(target)
        }
    }
}

#[cfg(target_os = "linux")]
fn install_desktop_file(app_dir: &Path, appimage_path: &Path) -> Result<(), std::io::Error> {
    let source = app_dir.join("garden.chiri.Chiri.desktop");
    if !source.exists() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "desktop file not found in AppImage",
        ));
    }

    let Some(home_dir) = dirs::home_dir() else {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "home directory not found",
        ));
    };

    let target_dir = home_dir.join(".local/share/applications");
    std::fs::create_dir_all(&target_dir)?;
    let target = target_dir.join("garden.chiri.Chiri.desktop");

    let content = std::fs::read_to_string(&source)?;
    let appimage_str = appimage_path.to_str().ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::InvalidData, "invalid AppImage path")
    })?;

    let mut patched = String::new();
    for line in content.lines() {
        if line.starts_with("Exec=") {
            patched.push_str(&format!("Exec={appimage_str} %u\n"));
        } else {
            patched.push_str(line);
            patched.push('\n');
        }
    }

    std::fs::write(&target, patched)?;
    log::info!("[AppImage] Installed desktop file: {}", target.display());

    refresh_applications_cache();

    Ok(())
}

#[cfg(target_os = "linux")]
fn refresh_applications_cache() {
    let Some(home_dir) = dirs::home_dir() else {
        return;
    };

    let apps_dir = home_dir.join(".local/share/applications");
    let hicolor_dir = home_dir.join(".local/share/icons/hicolor");

    for (cmd, args) in [
        ("update-desktop-database", vec![apps_dir.as_os_str()]),
        (
            "gtk4-update-icon-cache",
            vec![OsStr::new("-f"), OsStr::new("-t"), hicolor_dir.as_os_str()],
        ),
        (
            "gtk-update-icon-cache",
            vec![OsStr::new("-f"), OsStr::new("-t"), hicolor_dir.as_os_str()],
        ),
    ] {
        match std::process::Command::new(cmd).args(args).status() {
            Ok(status) if status.success() => {
                log::info!("[AppImage] Refreshed cache with {cmd}");
            }
            Ok(status) => {
                log::debug!("[AppImage] {cmd} exited with {status}");
            }
            Err(e) => {
                log::debug!("[AppImage] {cmd} not available: {e}");
            }
        }
    }
}

#[cfg(target_os = "linux")]
fn app_data_dir(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    match app_handle.path().app_data_dir() {
        Ok(dir) => Some(dir),
        Err(e) => {
            log::warn!("[AppImage] Failed to get app data dir: {e}");
            None
        }
    }
}

#[cfg(target_os = "linux")]
fn state_file_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("appimage-integration.json")
}

#[cfg(target_os = "linux")]
fn load_state(app_data_dir: &Path) -> IntegrationState {
    let path = state_file_path(app_data_dir);
    if !path.exists() {
        return IntegrationState::default();
    }
    match std::fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(e) => {
            log::warn!("[AppImage] Failed to read integration state: {e}");
            IntegrationState::default()
        }
    }
}

#[cfg(target_os = "linux")]
fn save_state(app_data_dir: &Path, state: &IntegrationState) {
    let path = state_file_path(app_data_dir);
    if let Some(parent) = path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            log::warn!("[AppImage] Failed to create state directory: {e}");
            return;
        }
    }
    if let Err(e) = std::fs::write(
        &path,
        serde_json::to_string_pretty(state).unwrap_or_default(),
    ) {
        log::warn!("[AppImage] Failed to write integration state: {e}");
    }
}

#[cfg(not(target_os = "linux"))]
pub fn install_icon_for_appimage() {}
