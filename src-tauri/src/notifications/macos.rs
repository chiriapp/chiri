use tauri::{AppHandle, Emitter, Manager};
use user_notify::{
    NotificationCategory, NotificationCategoryAction, NotificationResponse,
    NotificationResponseAction,
};

use super::manager::{
    NotificationActionEvent, NotificationManagerState, TASK_OVERDUE_CATEGORY,
    TASK_REMINDER_CATEGORY, USER_INFO_NOTIFICATION_TYPE, USER_INFO_TASK_ID,
};

// Action identifiers — macOS uses reverse-DNS strings; other platforms use plain strings
pub const ACTION_COMPLETE: &str = "moe.sapphic.Chiri.action.complete";
pub const ACTION_SNOOZE_15MIN: &str = "moe.sapphic.Chiri.action.snooze.15min";
pub const ACTION_SNOOZE_1HR: &str = "moe.sapphic.Chiri.action.snooze.1hr";
pub const ACTION_VIEW: &str = "moe.sapphic.Chiri.action.view";

impl NotificationManagerState {
    pub fn register_categories_and_handler(&self, app: AppHandle<impl tauri::Runtime>) {
        let categories = vec![
            NotificationCategory {
                identifier: TASK_OVERDUE_CATEGORY.to_string(),
                actions: vec![
                    NotificationCategoryAction::Action {
                        identifier: ACTION_COMPLETE.to_string(),
                        title: "Complete".to_string(),
                    },
                    NotificationCategoryAction::Action {
                        identifier: ACTION_SNOOZE_1HR.to_string(),
                        title: "Snooze 1hr".to_string(),
                    },
                    NotificationCategoryAction::Action {
                        identifier: ACTION_VIEW.to_string(),
                        title: "View Task".to_string(),
                    },
                ],
            },
            NotificationCategory {
                identifier: TASK_REMINDER_CATEGORY.to_string(),
                actions: vec![
                    NotificationCategoryAction::Action {
                        identifier: ACTION_COMPLETE.to_string(),
                        title: "Complete".to_string(),
                    },
                    NotificationCategoryAction::Action {
                        identifier: ACTION_SNOOZE_15MIN.to_string(),
                        title: "Snooze 15min".to_string(),
                    },
                    NotificationCategoryAction::Action {
                        identifier: ACTION_VIEW.to_string(),
                        title: "View Task".to_string(),
                    },
                ],
            },
        ];

        self.manager
            .register(
                Box::new(move |response| {
                    let app = app.clone();
                    tauri::async_runtime::spawn(async move {
                        handle_response(&app, response).await;
                    });
                }),
                categories,
            )
            .unwrap_or_else(|err| {
                eprintln!("[Notifications] Failed to register notification categories: {err:?}");
            });
    }
}

async fn handle_response(app: &AppHandle<impl tauri::Runtime>, response: NotificationResponse) {
    eprintln!("[Notifications] Received response: {response:?}");

    let task_id = match response.user_info.get(USER_INFO_TASK_ID) {
        Some(id) => id.clone(),
        None => {
            eprintln!("[Notifications] No task ID in notification response");
            return;
        }
    };

    let notification_type = response
        .user_info
        .get(USER_INFO_NOTIFICATION_TYPE)
        .cloned()
        .unwrap_or_else(|| "\"overdue\"".to_string());

    match response.action {
        NotificationResponseAction::Default => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            let _ = app.emit(
                "notification-action",
                NotificationActionEvent {
                    action: "view".to_string(),
                    task_id,
                    notification_type,
                },
            );
        }
        NotificationResponseAction::Dismiss => {
            eprintln!("[Notifications] Notification dismissed");
        }
        NotificationResponseAction::Other(action_id) => {
            let action_name = if action_id == ACTION_COMPLETE {
                "complete"
            } else if action_id == ACTION_SNOOZE_15MIN {
                "snooze-15min"
            } else if action_id == ACTION_SNOOZE_1HR {
                "snooze-1hr"
            } else if action_id == ACTION_VIEW {
                "view"
            } else {
                eprintln!("[Notifications] Unknown action: {action_id}");
                return;
            };

            let _ = app.emit(
                "notification-action",
                NotificationActionEvent {
                    action: action_name.to_string(),
                    task_id,
                    notification_type,
                },
            );

            if action_id == ACTION_VIEW {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
    }
}
