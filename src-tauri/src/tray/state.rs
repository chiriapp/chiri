use std::sync::Mutex;

use tauri::menu::MenuItem;

use super::AppRuntime;

type MenuUpdater = Box<dyn Fn(String) + Send>;

pub struct TrayState {
    menu_updater: Mutex<Option<MenuUpdater>>,
    sync_item: Mutex<Option<MenuItem<AppRuntime>>>,
    enabled: Mutex<bool>,
    /// true if the current desktop session actually has a tray host available
    /// (e.g., SNI/AppIndicator on Linux). on Linux this defaults to false and is
    /// updated once we detect the host; on macOS/Windows it's always true
    host_available: Mutex<bool>,
}

impl Default for TrayState {
    fn default() -> Self {
        Self {
            menu_updater: Mutex::new(None),
            sync_item: Mutex::new(None),
            enabled: Mutex::new(true),
            #[cfg(target_os = "linux")]
            host_available: Mutex::new(false),
            #[cfg(not(target_os = "linux"))]
            host_available: Mutex::new(true),
        }
    }
}

impl TrayState {
    pub fn is_enabled(&self) -> Result<bool, String> {
        self.enabled
            .lock()
            .map(|enabled| *enabled)
            .map_err(|e| format!("Failed to lock tray enabled state: {e}"))
    }

    pub(in crate::tray) fn set_enabled(&self, enabled: bool) -> Result<(), String> {
        *self
            .enabled
            .lock()
            .map_err(|e| format!("Failed to lock tray enabled state: {e}"))? = enabled;
        Ok(())
    }

    pub fn is_host_available(&self) -> Result<bool, String> {
        self.host_available
            .lock()
            .map(|available| *available)
            .map_err(|e| format!("Failed to lock tray host availability state: {e}"))
    }

    #[cfg(target_os = "linux")]
    pub(in crate::tray) fn set_host_available(&self, available: bool) -> Result<(), String> {
        *self
            .host_available
            .lock()
            .map_err(|e| format!("Failed to lock tray host availability state: {e}"))? = available;
        Ok(())
    }

    pub(in crate::tray) fn set_menu_updater(&self, updater: MenuUpdater) -> Result<(), String> {
        *self
            .menu_updater
            .lock()
            .map_err(|e| format!("Failed to lock tray menu updater: {e}"))? = Some(updater);
        Ok(())
    }

    pub(in crate::tray) fn set_sync_item(
        &self,
        sync_item: MenuItem<AppRuntime>,
    ) -> Result<(), String> {
        *self
            .sync_item
            .lock()
            .map_err(|e| format!("Failed to lock tray sync item: {e}"))? = Some(sync_item);
        Ok(())
    }

    pub(in crate::tray) fn update_sync_time(&self, time_str: String) -> Result<(), String> {
        if let Some(updater) = self
            .menu_updater
            .lock()
            .map_err(|e| format!("Failed to lock tray menu updater: {e}"))?
            .as_ref()
        {
            updater(time_str);
        }
        Ok(())
    }

    pub(in crate::tray) fn update_sync_enabled(&self, enabled: bool) -> Result<(), String> {
        if let Some(sync_item) = self
            .sync_item
            .lock()
            .map_err(|e| format!("Failed to lock tray sync item: {e}"))?
            .as_ref()
        {
            sync_item.set_enabled(enabled).map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_host_availability_matches_platform() {
        let state = TrayState::default();
        if cfg!(target_os = "linux") {
            assert!(!state.is_host_available().unwrap());
        } else {
            assert!(state.is_host_available().unwrap());
        }
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn host_availability_can_be_updated() {
        let state = TrayState::default();
        state.set_host_available(true).unwrap();
        assert!(state.is_host_available().unwrap());
        state.set_host_available(false).unwrap();
        assert!(!state.is_host_available().unwrap());
    }
}
