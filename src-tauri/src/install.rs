use std::env;
use std::path::Path;

/// represents the detected installation method
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InstallType {
    /// installed as an AppImage
    AppImage,
    /// installed from AUR (Arch User Repository)
    Aur,
    /// installed via Flatpak
    Flatpak,
    /// installed via Homebrew Cask
    Homebrew,
    /// installed via Nix package manager
    Nix,
    /// installed via Scoop package manager
    Scoop,
    /// standard installation (.deb, .rpm, .dmg, .exe, etc.)
    Standard,
}

impl InstallType {
    /// returns true if this installation type should have updates managed externally
    pub fn has_external_updates(self) -> bool {
        matches!(
            self,
            InstallType::Aur
                | InstallType::Flatpak
                | InstallType::Homebrew
                | InstallType::Nix
                | InstallType::Scoop
        )
    }
}

/// detect the installation type based on environment and binary location
pub fn detect_install_type() -> InstallType {
    // AppImage sets the APPIMAGE environment variable to the AppImage file path
    if env::var_os("APPIMAGE").is_some() {
        return InstallType::AppImage;
    }

    // check for AUR installation marker
    // AUR package creates a marker file during installation
    if Path::new("/usr/share/chiri/.aur-install").exists() {
        return InstallType::Aur;
    }

    // check for Flatpak (FLATPAK_ID environment variable is set by Flatpak runtime)
    if env::var("FLATPAK_ID").is_ok() {
        return InstallType::Flatpak;
    }

    // check for Homebrew Cask (Homebrew always creates a Caskroom directory for managed apps)
    if Path::new("/opt/homebrew/Caskroom/chiri").exists()
        || Path::new("/usr/local/Caskroom/chiri").exists()
    {
        return InstallType::Homebrew;
    }

    // check for Nix or Scoop via binary path
    if let Ok(exe_path) = env::current_exe() {
        if let Some(path_str) = exe_path.to_str() {
            if path_str.starts_with("/nix/store/") {
                return InstallType::Nix;
            }
            // Scoop installs to %USERPROFILE%\scoop\apps\chiri\current\
            if path_str.contains("\\scoop\\apps\\") {
                return InstallType::Scoop;
            }
        }
    }

    InstallType::Standard
}

/// Tauri command to check if updates should be disabled
#[tauri::command]
pub fn should_disable_updates() -> bool {
    let install_type = detect_install_type();
    install_type.has_external_updates()
}

/// Tauri command to get the installation type as a string
#[tauri::command]
pub fn get_install_type() -> String {
    let install_type = detect_install_type();
    match install_type {
        InstallType::AppImage => "appimage".to_string(),
        InstallType::Aur => "aur".to_string(),
        InstallType::Flatpak => "flatpak".to_string(),
        InstallType::Homebrew => "homebrew".to_string(),
        InstallType::Nix => "nix".to_string(),
        InstallType::Scoop => "scoop".to_string(),
        InstallType::Standard => "standard".to_string(),
    }
}
