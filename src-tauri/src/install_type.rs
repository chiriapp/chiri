use std::env;
use std::path::Path;

/// Represents the detected installation method
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InstallType {
    /// Installed from AUR (Arch User Repository)
    Aur,
    /// Installed via Flatpak
    Flatpak,
    /// Installed via Homebrew Cask
    Homebrew,
    /// Installed via Nix package manager
    Nix,
    /// Installed via Scoop package manager
    Scoop,
    /// Standard installation (AppImage, .deb, .rpm, .dmg, .exe, etc.)
    Standard,
}

impl InstallType {
    /// Returns true if this installation type should have updates managed externally
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

/// Detect the installation type based on environment and binary location
pub fn detect_install_type() -> InstallType {
    // Check for AUR installation marker
    // AUR package creates a marker file during installation
    if Path::new("/usr/share/chiri/.aur-install").exists() {
        return InstallType::Aur;
    }

    // Check for Flatpak (FLATPAK_ID environment variable is set by Flatpak runtime)
    if env::var("FLATPAK_ID").is_ok() {
        return InstallType::Flatpak;
    }

    // Check for Homebrew Cask (Homebrew always creates a Caskroom directory for managed apps)
    if Path::new("/opt/homebrew/Caskroom/chiri").exists()
        || Path::new("/usr/local/Caskroom/chiri").exists()
    {
        return InstallType::Homebrew;
    }

    // Check for Nix or Scoop via binary path
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
        InstallType::Aur => "aur".to_string(),
        InstallType::Flatpak => "flatpak".to_string(),
        InstallType::Homebrew => "homebrew".to_string(),
        InstallType::Nix => "nix".to_string(),
        InstallType::Scoop => "scoop".to_string(),
        InstallType::Standard => "standard".to_string(),
    }
}
