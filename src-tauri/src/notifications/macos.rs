use tauri::AppHandle;
use user_notify::{
    NotificationCategory, NotificationCategoryAction, NotificationResponse,
    NotificationResponseAction,
};

use super::{
    actions::{
        self, emit_action, macos_action_name, show_main_window, MACOS_COMPLETE, MACOS_VIEW, VIEW,
    },
    state::NotificationManagerState,
    types::{
        NotificationActionConfig, TASK_OVERDUE_CATEGORY, TASK_REMINDER_CATEGORY,
        USER_INFO_NOTIFICATION_TYPE, USER_INFO_TASK_ID,
    },
};

impl NotificationManagerState {
    pub fn register_categories_and_handler(
        &self,
        app: AppHandle<impl tauri::Runtime>,
        config: &NotificationActionConfig,
    ) {
        let categories = vec![
            NotificationCategory {
                identifier: TASK_OVERDUE_CATEGORY.to_string(),
                actions: build_category_actions(config),
            },
            NotificationCategory {
                identifier: TASK_REMINDER_CATEGORY.to_string(),
                actions: build_category_actions(config),
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
                log::warn!("[Notifications] Failed to register notification categories: {err:?}");
            });
    }

    /// Updates notification categories when the user changes action-button settings.
    /// Does NOT re-register the delegate; call `register_categories_and_handler` once at startup.
    pub fn update_categories(
        &self,
        app: AppHandle<impl tauri::Runtime>,
        config: &NotificationActionConfig,
    ) {
        use objc2_foundation::{NSArray, NSSet, NSString};
        use objc2_user_notifications::{
            UNNotificationAction, UNNotificationActionOptions, UNNotificationCategory,
            UNNotificationCategoryOptions, UNUserNotificationCenter,
        };

        let config = config.clone();
        let _ = app.run_on_main_thread(move || {
            let build_category = |category_id: &'static str| {
                let identifier = NSString::from_str(category_id);
                let actions: Vec<_> = build_category_actions(&config)
                    .into_iter()
                    .map(|action| match action {
                        NotificationCategoryAction::Action { identifier, title } => {
                            let id = NSString::from_str(&identifier);
                            let title = NSString::from_str(&title);
                            UNNotificationAction::actionWithIdentifier_title_options(
                                &id,
                                &title,
                                UNNotificationActionOptions::empty(),
                            )
                        }
                        NotificationCategoryAction::TextInputAction { .. } => {
                            unreachable!("text input notification actions are not supported")
                        }
                    })
                    .collect();
                let action_array = NSArray::from_retained_slice(&actions);
                UNNotificationCategory::categoryWithIdentifier_actions_intentIdentifiers_options(
                    &identifier,
                    &action_array,
                    &NSArray::new(),
                    UNNotificationCategoryOptions::empty(),
                )
            };

            let overdue = build_category(TASK_OVERDUE_CATEGORY);
            let reminder = build_category(TASK_REMINDER_CATEGORY);
            let categories = NSSet::from_retained_slice(&[overdue, reminder]);

            UNUserNotificationCenter::currentNotificationCenter()
                .setNotificationCategories(&categories);
        });
    }
}

fn build_category_actions(config: &NotificationActionConfig) -> Vec<NotificationCategoryAction> {
    config
        .action_order
        .iter()
        .filter_map(|key| match key.as_str() {
            "complete" if config.show_complete => Some(NotificationCategoryAction::Action {
                identifier: MACOS_COMPLETE.to_string(),
                title: "Complete".to_string(),
            }),
            "snooze" if config.show_snooze => {
                let identifier = actions::macos_snooze_action_id(config.snooze_duration_minutes);
                Some(NotificationCategoryAction::Action {
                    identifier,
                    title: format!("Snooze {}min", config.snooze_duration_minutes),
                })
            }
            "view" if config.show_view => Some(NotificationCategoryAction::Action {
                identifier: MACOS_VIEW.to_string(),
                title: "View".to_string(),
            }),
            _ => None,
        })
        .collect()
}

async fn handle_response(app: &AppHandle<impl tauri::Runtime>, response: NotificationResponse) {
    log::debug!("[Notifications] Received response: {response:?}");

    let task_id = match response.user_info.get(USER_INFO_TASK_ID) {
        Some(id) => id.clone(),
        None => {
            log::warn!("[Notifications] No task ID in notification response");
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
            show_main_window(app);
            emit_action(app, VIEW, task_id, notification_type);
        }
        NotificationResponseAction::Dismiss => {
            log::debug!("[Notifications] Notification dismissed");
        }
        NotificationResponseAction::Other(action_id) => {
            let Some(action_name) = macos_action_name(&action_id) else {
                log::warn!("[Notifications] Unknown action: {action_id}");
                return;
            };

            emit_action(app, &action_name, task_id, notification_type);

            if action_name == VIEW {
                show_main_window(app);
            }
        }
    }
}
