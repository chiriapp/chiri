use tauri::State;

#[cfg(target_os = "macos")]
use user_notify::NotificationBuilder;

use super::{
    state::NotificationManagerState,
    types::{NotificationActionConfig, SendNotificationRequest, SimpleNotificationRequest},
};

#[cfg(target_os = "macos")]
use super::types::{
    NotificationType, TASK_OVERDUE_CATEGORY, TASK_REMINDER_CATEGORY, USER_INFO_NOTIFICATION_TYPE,
    USER_INFO_TASK_ID,
};

/// update the configurable notification action buttons and, on macOS, re-register
/// the notification categories so the new actions take effect for future notifications
#[tauri::command]
pub async fn set_notification_action_config(
    app: tauri::AppHandle,
    config: NotificationActionConfig,
    state: State<'_, NotificationManagerState>,
) -> Result<(), String> {
    state.set_config(config.clone());

    #[cfg(target_os = "macos")]
    state.update_categories(app, &config);

    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
    }

    Ok(())
}

/// send a notification with action buttons (Complete / Snooze / View)
#[tauri::command]
pub async fn send_notification_with_actions(
    app: tauri::AppHandle,
    request: SendNotificationRequest,
    _state: State<'_, NotificationManagerState>,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let config = _state.config();
        super::linux::send_notification(&app, &request, &config)
    }

    #[cfg(target_os = "windows")]
    {
        let config = _state.config();
        return super::windows::send_notification(&app, &request, &config);
    }

    #[cfg(target_os = "macos")]
    {
        let _ = app;

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

        super::macos::send_notification(
            &request.title,
            &request.body,
            category_id,
            user_info,
            super::macos::InterruptionLevel::TimeSensitive,
        )
        .await
        .map_err(|e| format!("Failed to send notification: {e}"))?;

        Ok(())
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        let _ = (app, request, _state);
        Err("Notifications are not supported on this platform".to_string())
    }
}

/// send a simple notification without actions or task metadata
/// used for system notifications like quit confirmation
#[tauri::command]
pub async fn send_simple_notification(
    app: tauri::AppHandle,
    request: SimpleNotificationRequest,
    state: State<'_, NotificationManagerState>,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let _ = state;
        super::linux::send_simple_notification(&app, &request)
    }

    #[cfg(target_os = "windows")]
    {
        let _ = state;
        return super::windows::send_simple_notification(&app, &request);
    }

    #[cfg(target_os = "macos")]
    {
        let _ = app;

        let notification = NotificationBuilder::new()
            .title(&request.title)
            .body(&request.body);

        state
            .manager
            .send_notification(notification)
            .await
            .map_err(|e| format!("Failed to send notification: {e:?}"))?;

        Ok(())
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        let _ = (app, request, state);
        Err("Notifications are not supported on this platform".to_string())
    }
}
