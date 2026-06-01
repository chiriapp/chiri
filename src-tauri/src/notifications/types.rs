use serde::{Deserialize, Serialize};

#[cfg(target_os = "macos")]
pub const TASK_OVERDUE_CATEGORY: &str = "garden.chiri.Chiri.task.overdue";
#[cfg(target_os = "macos")]
pub const TASK_REMINDER_CATEGORY: &str = "garden.chiri.Chiri.task.reminder";

#[cfg(target_os = "macos")]
pub const USER_INFO_TASK_ID: &str = "taskId";
#[cfg(target_os = "macos")]
pub const USER_INFO_NOTIFICATION_TYPE: &str = "notificationType";

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

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NotificationActionEvent {
    pub action: String,
    pub task_id: String,
    pub notification_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimpleNotificationRequest {
    pub title: String,
    pub body: String,
}
