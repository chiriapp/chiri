use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
#[cfg(target_os = "macos")]
use tauri::{AppHandle, Emitter, Manager};
use user_notify::{NotificationBuilder, NotificationManager};
#[cfg(target_os = "macos")]
use user_notify::{
    get_notification_manager, NotificationCategory, NotificationCategoryAction,
    NotificationResponse, NotificationResponseAction,
};

// Notification action category identifiers
pub const TASK_OVERDUE_CATEGORY: &str = "moe.sapphic.Chiri.task.overdue";
pub const TASK_REMINDER_CATEGORY: &str = "moe.sapphic.Chiri.task.reminder";

// Action identifiers
#[cfg(target_os = "macos")]
pub const ACTION_COMPLETE: &str = "moe.sapphic.Chiri.action.complete";
#[cfg(target_os = "macos")]
pub const ACTION_SNOOZE_15MIN: &str = "moe.sapphic.Chiri.action.snooze.15min";
#[cfg(target_os = "macos")]
pub const ACTION_SNOOZE_1HR: &str = "moe.sapphic.Chiri.action.snooze.1hr";
#[cfg(target_os = "macos")]
pub const ACTION_VIEW: &str = "moe.sapphic.Chiri.action.view";

// User info keys for notification metadata
pub const USER_INFO_TASK_ID: &str = "taskId";
pub const USER_INFO_NOTIFICATION_TYPE: &str = "notificationType";

#[derive(Debug, Clone)]
pub struct NotificationManagerState {
    pub manager: Arc<dyn NotificationManager>,
}

#[cfg(target_os = "macos")]
impl NotificationManagerState {
    pub fn new(app_id: String) -> Self {
        Self {
            manager: get_notification_manager(app_id, None),
        }
    }

    pub fn register_categories_and_handler(&self, app: AppHandle) {
        let categories = vec![
            // Category for overdue task notifications
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
            // Category for reminder notifications
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
                        handle_notification_response(&app, response).await;
                    });
                }),
                categories,
            )
            .unwrap_or_else(|err| {
                eprintln!("[Notifications] Failed to register notification categories: {err:?}");
            });
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendNotificationRequest {
    pub title: String,
    pub body: String,
    pub task_id: String,
    pub notification_type: NotificationType,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NotificationType {
    Overdue,
    Reminder,
}

#[cfg(target_os = "macos")]
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NotificationActionEvent {
    pub action: String,
    pub task_id: String,
    pub notification_type: String,
}

/// Send a notification with actions
#[tauri::command]
pub async fn send_notification_with_actions(
    request: SendNotificationRequest,
    state: State<'_, NotificationManagerState>,
) -> Result<(), String> {
    let category_id = match request.notification_type {
        NotificationType::Overdue => TASK_OVERDUE_CATEGORY,
        NotificationType::Reminder => TASK_REMINDER_CATEGORY,
    };

    let mut user_info = std::collections::HashMap::new();
    user_info.insert(USER_INFO_TASK_ID.to_string(), request.task_id);
    user_info.insert(
        USER_INFO_NOTIFICATION_TYPE.to_string(),
        serde_json::to_string(&request.notification_type).map_err(|e| e.to_string())?,
    );

    let notification = NotificationBuilder::new()
        .title(&request.title)
        .body(&request.body)
        .set_category_id(category_id)
        .set_user_info(user_info);

    state
        .manager
        .send_notification(notification)
        .await
        .map_err(|e| format!("Failed to send notification: {e:?}"))?;

    Ok(())
}

/// Handle notification response (user clicked notification or action)
#[cfg(target_os = "macos")]
async fn handle_notification_response(app: &AppHandle, response: NotificationResponse) {
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
            // User clicked the notification - open the app and focus the task
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
            // User dismissed the notification - no action needed
            eprintln!("[Notifications] Notification dismissed");
        }
        NotificationResponseAction::Other(action_id) => {
            // User clicked an action button
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

            // Emit event to frontend
            let _ = app.emit(
                "notification-action",
                NotificationActionEvent {
                    action: action_name.to_string(),
                    task_id,
                    notification_type,
                },
            );

            // Only show and focus the window for "View Task" action
            // Complete and Snooze actions work silently in the background
            if action_id == ACTION_VIEW {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
    }
}
