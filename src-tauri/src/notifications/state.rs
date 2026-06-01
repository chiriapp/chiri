#[cfg(target_os = "macos")]
use std::sync::Arc;

#[cfg(target_os = "macos")]
use user_notify::{get_notification_manager, NotificationManager};

#[derive(Debug, Clone)]
pub struct NotificationManagerState {
    #[cfg(target_os = "macos")]
    pub(crate) manager: Arc<dyn NotificationManager>,
}

impl NotificationManagerState {
    pub fn new(app_id: String) -> Self {
        #[cfg(target_os = "macos")]
        {
            Self {
                manager: get_notification_manager(app_id, None),
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            let _ = app_id;
            Self {}
        }
    }
}
