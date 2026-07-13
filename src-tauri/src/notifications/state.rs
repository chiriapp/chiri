use std::sync::{Arc, RwLock};

#[cfg(target_os = "macos")]
use user_notify::{get_notification_manager, NotificationManager};

use super::types::NotificationActionConfig;

#[derive(Debug, Clone)]
pub struct NotificationManagerState {
    pub(crate) config: Arc<RwLock<NotificationActionConfig>>,
    #[cfg(target_os = "macos")]
    pub(crate) manager: Arc<dyn NotificationManager>,
}

impl NotificationManagerState {
    pub fn new(app_id: String) -> Self {
        #[cfg(target_os = "macos")]
        {
            Self {
                config: Arc::new(RwLock::new(NotificationActionConfig::default())),
                manager: get_notification_manager(app_id, None),
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            let _ = app_id;
            Self {
                config: Arc::new(RwLock::new(NotificationActionConfig::default())),
            }
        }
    }

    pub fn config(&self) -> NotificationActionConfig {
        self.config
            .read()
            .expect("notification config lock poisoned")
            .clone()
    }

    pub fn set_config(&self, config: NotificationActionConfig) {
        *self
            .config
            .write()
            .expect("notification config lock poisoned") = config;
    }
}
