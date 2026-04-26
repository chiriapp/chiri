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

// macOS FFI bridge (companion: notifications.m)
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
extern "C" fn check_permission_callback(status_ptr: *const std::os::raw::c_char) {
    if status_ptr.is_null() {
        *PERMISSION_STATUS_RESULT.lock().unwrap() = Some("default".to_string());
        return;
    }
    unsafe {
        let status = std::ffi::CStr::from_ptr(status_ptr)
            .to_string_lossy()
            .into_owned();
        *PERMISSION_STATUS_RESULT.lock().unwrap() = Some(status);
        free_notification_string_ffi(status_ptr as *mut std::os::raw::c_char);
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
    *PERMISSION_REQUEST_RESULT.lock().unwrap() = Some((granted, status));
}

// Tauri commands

#[tauri::command]
pub async fn check_notification_permission() -> Result<NotificationPermissionStatus, String> {
    #[cfg(target_os = "macos")]
    {
        use std::{thread, time::Duration};
        *PERMISSION_STATUS_RESULT.lock().unwrap() = None;
        unsafe { check_notification_permission_ffi(check_permission_callback) };
        for _ in 0..50 {
            thread::sleep(Duration::from_millis(10));
            if let Some(status) = PERMISSION_STATUS_RESULT.lock().unwrap().clone() {
                return Ok(NotificationPermissionStatus { status });
            }
        }
        return Ok(NotificationPermissionStatus {
            status: "default".to_string(),
        });
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
        *PERMISSION_REQUEST_RESULT.lock().unwrap() = None;
        unsafe { request_notification_permission_ffi(request_permission_callback) };
        for i in 0..3000 {
            thread::sleep(Duration::from_millis(10));
            if let Some((granted, status)) = PERMISSION_REQUEST_RESULT.lock().unwrap().clone() {
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
                eprintln!(
                    "[Notifications] Still waiting for permission response... ({}s)",
                    i / 100
                );
            }
        }
        eprintln!("[Notifications] Permission request timed out after 30 seconds");
        return Err("Request timed out".to_string());
    }

    #[cfg(not(target_os = "macos"))]
    Ok(NotificationPermissionResult {
        granted: true,
        status: "granted".to_string(),
    })
}
