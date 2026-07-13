use tauri::AppHandle;
use user_notify::{
    NotificationCategory, NotificationCategoryAction, NotificationResponse,
    NotificationResponseAction,
};

#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
pub enum InterruptionLevel {
    Passive,
    Active,
    TimeSensitive,
}

/// Send a macOS notification directly through UNUserNotificationCenter so we can
/// set the interruption level (e.g., time-sensitive). The categories and delegate
/// are still registered via `user-notify`, so action buttons and response handling
/// continue to work.
pub async fn send_notification(
    title: &str,
    body: &str,
    category_id: &str,
    user_info: std::collections::HashMap<String, String>,
    interruption_level: InterruptionLevel,
) -> Result<(), String> {
    use objc2::rc::Retained;
    use objc2::runtime::AnyObject;
    use objc2_foundation::{NSBundle, NSDictionary, NSString};
    use objc2_user_notifications::{
        UNMutableNotificationContent, UNNotificationInterruptionLevel, UNNotificationRequest,
        UNNotificationSound, UNUserNotificationCenter,
    };
    use std::ops::Deref;

    let bundle_id = NSBundle::mainBundle()
        .bundleIdentifier()
        .map(|ns| ns.to_string())
        .ok_or("No bundle identifier found")?;

    let (tx, rx) = tokio::sync::oneshot::channel::<Result<(), String>>();

    unsafe {
        let content = UNMutableNotificationContent::new();

        content.setTitle(&NSString::from_str(title));
        content.setBody(&NSString::from_str(body));
        content.setCategoryIdentifier(&NSString::from_str(category_id));
        content.setSound(Some(UNNotificationSound::defaultSound().deref()));

        let level = match interruption_level {
            InterruptionLevel::Passive => UNNotificationInterruptionLevel::Passive,
            InterruptionLevel::Active => UNNotificationInterruptionLevel::Active,
            InterruptionLevel::TimeSensitive => UNNotificationInterruptionLevel::TimeSensitive,
        };
        content.setInterruptionLevel(level);

        let mut keys = Vec::with_capacity(user_info.len());
        let mut values = Vec::with_capacity(user_info.len());
        for (key, value) in &user_info {
            keys.push(NSString::from_str(key));
            values.push(NSString::from_str(value));
        }

        let string_dictionary = NSDictionary::from_slices(
            keys.iter()
                .map(|r| r.deref())
                .collect::<Vec<&NSString>>()
                .as_slice(),
            values
                .iter()
                .map(|r| r.deref())
                .collect::<Vec<&NSString>>()
                .as_slice(),
        );
        let anyobject_dictionary =
            Retained::cast_unchecked::<NSDictionary<AnyObject, AnyObject>>(string_dictionary);
        content.setUserInfo(anyobject_dictionary.deref());

        let id = format!("{}.{}", uuid::Uuid::new_v4(), bundle_id);
        let request = UNNotificationRequest::requestWithIdentifier_content_trigger(
            &NSString::from_str(&id),
            &content,
            None,
        );

        let cb = std::cell::RefCell::new(Some(tx));
        let block = block2::RcBlock::new(move |error: *mut objc2_foundation::NSError| {
            if error.is_null() {
                if let Some(cb) = cb.take() {
                    let _ = cb.send(Ok(()));
                }
            } else if let Some(cb) = cb.take() {
                let err = error
                    .as_ref()
                    .map(|e| e.localizedDescription().to_string())
                    .unwrap_or_else(|| "Failed to read error".to_string());
                let _ = cb.send(Err(err));
            }
        });

        UNUserNotificationCenter::currentNotificationCenter()
            .addNotificationRequest_withCompletionHandler(&request, Some(&block));
    }

    rx.await
        .map_err(|e| format!("Notification send cancelled: {e}"))?
}

use super::{
    actions::{
        self, emit_action, macos_action_name, show_main_window, HIGHLIGHT, MACOS_COMPLETE,
        MAX_NOTIFICATION_ACTIONS,
    },
    state::NotificationManagerState,
    types::{
        NotificationActionConfig, TASK_OVERDUE_CATEGORY, TASK_REMINDER_CATEGORY,
        USER_INFO_NOTIFICATION_TYPE, USER_INFO_TASK_ID,
    },
};

/// macOS notifications require the process to be running inside a proper `.app` bundle
/// when launched from `cargo run`/`target/debug/`, the main bundle has no identifier,
/// and `UNUserNotificationCenter::currentNotificationCenter` throws an exception
fn running_in_app_bundle() -> bool {
    use objc2_foundation::NSBundle;
    NSBundle::mainBundle().bundleIdentifier().is_some()
}

impl NotificationManagerState {
    pub fn register_categories_and_handler(
        &self,
        app: AppHandle<impl tauri::Runtime>,
        config: &NotificationActionConfig,
    ) {
        if !running_in_app_bundle() {
            log::warn!(
                "[Notifications] Not running inside an app bundle; skipping notification category registration."
            );
            return;
        }

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

        if !running_in_app_bundle() {
            log::warn!(
                "[Notifications] Not running inside an app bundle; skipping notification category update."
            );
            return;
        }

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
    let mut actions: Vec<NotificationCategoryAction> = Vec::new();

    for key in &config.action_order {
        if actions.len() >= MAX_NOTIFICATION_ACTIONS {
            break;
        }

        match key.as_str() {
            "complete" if config.show_complete => {
                actions.push(NotificationCategoryAction::Action {
                    identifier: MACOS_COMPLETE.to_string(),
                    title: "Complete".to_string(),
                });
            }
            "snooze" if config.show_snooze => {
                for duration in &config.snooze_durations {
                    if actions.len() >= MAX_NOTIFICATION_ACTIONS {
                        break;
                    }
                    actions.push(NotificationCategoryAction::Action {
                        identifier: actions::macos_snooze_action_id(*duration),
                        title: actions::macos_snooze_label(*duration),
                    });
                }
            }
            _ => {}
        }
    }

    actions
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
            // body click on macOS: bring the window forward and highlight the task.
            show_main_window(app);
            emit_action(app, HIGHLIGHT, task_id, notification_type);
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
        }
    }
}
