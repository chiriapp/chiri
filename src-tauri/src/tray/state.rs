use std::sync::Mutex;

#[cfg(not(target_os = "linux"))]
use tauri::menu::MenuItem;

#[cfg(not(target_os = "linux"))]
use super::AppRuntime;

#[cfg(not(target_os = "linux"))]
type MenuUpdater = Box<dyn Fn(String) + Send>;

pub(crate) const LAST_SYNC_NEVER: &str = "Last sync: Never";

/// label for the tray's sync entry; without a syncable account it points at account setup instead
pub(crate) const fn sync_label(has_caldav_account: bool) -> &'static str {
    if has_caldav_account {
        "Sync Now"
    } else {
        "Add Account..."
    }
}

pub struct TrayState {
    #[cfg(not(target_os = "linux"))]
    menu_updater: Mutex<Option<MenuUpdater>>,
    #[cfg(not(target_os = "linux"))]
    sync_item: Mutex<Option<MenuItem<AppRuntime>>>,
    enabled: Mutex<bool>,
    /// whether any account can sync; decides what the tray's sync item offers
    has_caldav_account: Mutex<bool>,
    /// kept here so a tray created after the frontend's first update still renders the right text
    last_sync_text: Mutex<String>,
    /// true if the current desktop session actually has a tray host available
    host_available: Mutex<bool>,
    #[cfg(target_os = "linux")]
    linux_tray: Mutex<Option<ksni::Handle<super::linux::LinuxTray>>>,
}

impl Default for TrayState {
    fn default() -> Self {
        Self {
            #[cfg(not(target_os = "linux"))]
            menu_updater: Mutex::new(None),
            #[cfg(not(target_os = "linux"))]
            sync_item: Mutex::new(None),
            enabled: Mutex::new(true),
            has_caldav_account: Mutex::new(true),
            last_sync_text: Mutex::new(LAST_SYNC_NEVER.into()),
            #[cfg(target_os = "linux")]
            host_available: Mutex::new(false),
            #[cfg(not(target_os = "linux"))]
            host_available: Mutex::new(true),
            #[cfg(target_os = "linux")]
            linux_tray: Mutex::new(None),
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

    pub(in crate::tray) fn has_caldav_account(&self) -> Result<bool, String> {
        self.has_caldav_account
            .lock()
            .map(|has| *has)
            .map_err(|e| format!("Failed to lock tray account state: {e}"))
    }

    pub(in crate::tray) fn last_sync_text(&self) -> Result<String, String> {
        self.last_sync_text
            .lock()
            .map(|text| text.clone())
            .map_err(|e| format!("Failed to lock tray last sync text: {e}"))
    }

    pub fn is_host_available(&self) -> Result<bool, String> {
        self.host_available
            .lock()
            .map(|available| *available)
            .map_err(|e| format!("Failed to lock tray host availability state: {e}"))
    }

    #[cfg(target_os = "linux")]
    pub(crate) fn set_host_available(&self, available: bool) -> Result<(), String> {
        *self
            .host_available
            .lock()
            .map_err(|e| format!("Failed to lock tray host availability state: {e}"))? = available;
        Ok(())
    }

    #[cfg(not(target_os = "linux"))]
    pub(in crate::tray) fn set_menu_updater(&self, updater: MenuUpdater) -> Result<(), String> {
        *self
            .menu_updater
            .lock()
            .map_err(|e| format!("Failed to lock tray menu updater: {e}"))? = Some(updater);
        Ok(())
    }

    #[cfg(not(target_os = "linux"))]
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

    #[cfg(target_os = "linux")]
    pub(in crate::tray) fn linux_tray_handle(
        &self,
    ) -> Result<Option<ksni::Handle<super::linux::LinuxTray>>, String> {
        self.linux_tray
            .lock()
            .map(|tray| tray.clone())
            .map_err(|e| format!("Failed to lock Linux tray: {e}"))
    }

    #[cfg(target_os = "linux")]
    pub(in crate::tray) fn set_linux_tray(
        &self,
        handle: ksni::Handle<super::linux::LinuxTray>,
    ) -> Result<(), String> {
        *self
            .linux_tray
            .lock()
            .map_err(|e| format!("Failed to lock Linux tray: {e}"))? = Some(handle);
        Ok(())
    }

    pub(in crate::tray) fn update_sync_time(&self, time_str: String) -> Result<(), String> {
        *self
            .last_sync_text
            .lock()
            .map_err(|e| format!("Failed to lock tray last sync text: {e}"))? = time_str.clone();

        #[cfg(target_os = "linux")]
        {
            let handle = self.linux_tray_handle()?;
            tauri::async_runtime::spawn(async move {
                if let Some(handle) = handle {
                    let _ = handle
                        .update(|tray| {
                            tray.last_sync = time_str;
                        })
                        .await;
                }
            });
        }

        #[cfg(not(target_os = "linux"))]
        {
            if let Some(updater) = self
                .menu_updater
                .lock()
                .map_err(|e| format!("Failed to lock tray menu updater: {e}"))?
                .as_ref()
            {
                updater(time_str);
            }
        }

        Ok(())
    }

    pub(in crate::tray) fn update_accounts(&self, has_caldav_account: bool) -> Result<(), String> {
        *self
            .has_caldav_account
            .lock()
            .map_err(|e| format!("Failed to lock tray account state: {e}"))? = has_caldav_account;

        #[cfg(target_os = "linux")]
        {
            let handle = self.linux_tray_handle()?;
            tauri::async_runtime::spawn(async move {
                if let Some(handle) = handle {
                    let _ = handle
                        .update(|tray| {
                            tray.has_caldav_account = has_caldav_account;
                        })
                        .await;
                }
            });
        }

        #[cfg(not(target_os = "linux"))]
        {
            if let Some(sync_item) = self
                .sync_item
                .lock()
                .map_err(|e| format!("Failed to lock tray sync item: {e}"))?
                .as_ref()
            {
                sync_item
                    .set_text(sync_label(has_caldav_account))
                    .map_err(|e| e.to_string())?;
            }
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
