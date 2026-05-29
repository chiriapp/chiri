use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationPermissionStatus {
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationPermissionResult {
    pub granted: bool,
    pub status: String,
}

// macOS FFI bridge (companion: swift/Sources/ChiriMacOSBridge/Notifications.swift)
#[cfg(target_os = "macos")]
extern "C" {
    fn check_notification_permission_ffi(callback: extern "C" fn(*const std::os::raw::c_char));
    fn request_notification_permission_ffi(
        callback: extern "C" fn(bool, *const std::os::raw::c_char),
    );
    fn free_notification_string_ffi(ptr: *mut std::os::raw::c_char);
}

#[cfg(target_os = "macos")]
static PERMISSION_STATUS_RESULT: std::sync::Mutex<Option<String>> = std::sync::Mutex::new(None);

#[cfg(target_os = "macos")]
static PERMISSION_REQUEST_RESULT: std::sync::Mutex<Option<(bool, String)>> =
    std::sync::Mutex::new(None);

#[cfg(target_os = "macos")]
fn set_status_result(value: Option<String>) -> Result<(), String> {
    let mut result = PERMISSION_STATUS_RESULT
        .lock()
        .map_err(|e| format!("Notification permission status lock poisoned: {e}"))?;
    *result = value;
    Ok(())
}

#[cfg(target_os = "macos")]
fn status_result() -> Result<Option<String>, String> {
    PERMISSION_STATUS_RESULT
        .lock()
        .map(|result| result.clone())
        .map_err(|e| format!("Notification permission status lock poisoned: {e}"))
}

#[cfg(target_os = "macos")]
fn set_request_result(value: Option<(bool, String)>) -> Result<(), String> {
    let mut result = PERMISSION_REQUEST_RESULT
        .lock()
        .map_err(|e| format!("Notification permission request lock poisoned: {e}"))?;
    *result = value;
    Ok(())
}

#[cfg(target_os = "macos")]
fn request_result() -> Result<Option<(bool, String)>, String> {
    PERMISSION_REQUEST_RESULT
        .lock()
        .map(|result| result.clone())
        .map_err(|e| format!("Notification permission request lock poisoned: {e}"))
}

#[cfg(target_os = "macos")]
extern "C" fn check_permission_callback(status_ptr: *const std::os::raw::c_char) {
    if status_ptr.is_null() {
        if let Err(e) = set_status_result(Some("default".to_string())) {
            log::warn!("[Notifications] {e}");
        }
        return;
    }
    unsafe {
        let status = std::ffi::CStr::from_ptr(status_ptr)
            .to_string_lossy()
            .into_owned();
        free_notification_string_ffi(status_ptr as *mut std::os::raw::c_char);
        if let Err(e) = set_status_result(Some(status)) {
            log::warn!("[Notifications] {e}");
        }
    }
}

#[cfg(target_os = "macos")]
extern "C" fn request_permission_callback(granted: bool, status_ptr: *const std::os::raw::c_char) {
    let status = if status_ptr.is_null() {
        if granted { "granted" } else { "denied" }.to_string()
    } else {
        unsafe {
            let s = std::ffi::CStr::from_ptr(status_ptr)
                .to_string_lossy()
                .into_owned();
            free_notification_string_ffi(status_ptr as *mut std::os::raw::c_char);
            s
        }
    };
    if let Err(e) = set_request_result(Some((granted, status))) {
        log::warn!("[Notifications] {e}");
    }
}

// Tauri commands

#[tauri::command]
pub async fn check_notification_permission() -> Result<NotificationPermissionStatus, String> {
    #[cfg(target_os = "macos")]
    {
        use std::{thread, time::Duration};
        set_status_result(None)?;
        unsafe { check_notification_permission_ffi(check_permission_callback) };
        for _ in 0..50 {
            thread::sleep(Duration::from_millis(10));
            if let Some(status) = status_result()? {
                return Ok(NotificationPermissionStatus { status });
            }
        }
        Ok(NotificationPermissionStatus {
            status: "default".to_string(),
        })
    }

    #[cfg(not(target_os = "macos"))]
    Ok(NotificationPermissionStatus {
        status: "granted".to_string(),
    })
}

#[tauri::command]
pub async fn request_notification_permission() -> Result<NotificationPermissionResult, String> {
    #[cfg(target_os = "macos")]
    {
        use std::{thread, time::Duration};
        set_request_result(None)?;
        unsafe { request_notification_permission_ffi(request_permission_callback) };
        for i in 0..3000 {
            thread::sleep(Duration::from_millis(10));
            if let Some((granted, status)) = request_result()? {
                let normalized_status = if granted {
                    "granted".to_string()
                } else if status.contains("not allowed")
                    || status.contains("denied")
                    || status.contains("Error Domain")
                {
                    "denied".to_string()
                } else {
                    status
                };
                return Ok(NotificationPermissionResult {
                    granted,
                    status: normalized_status,
                });
            }
            if i > 0 && i % 100 == 0 {
                log::debug!(
                    "[Notifications] Still waiting for permission response... ({}s)",
                    i / 100
                );
            }
        }
        log::warn!("[Notifications] Permission request timed out after 30 seconds");
        Err("Request timed out".to_string())
    }

    #[cfg(not(target_os = "macos"))]
    Ok(NotificationPermissionResult {
        granted: true,
        status: "granted".to_string(),
    })
}
