use serde::{Deserialize, Serialize};
#[cfg(target_os = "macos")]
use std::ffi::CStr;
#[cfg(target_os = "macos")]
use std::os::raw::c_char;
#[cfg(target_os = "macos")]
use std::sync::Mutex;

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

#[cfg(target_os = "macos")]
extern "C" {
    fn check_notification_permission_ffi(callback: extern "C" fn(*const c_char));
    fn request_notification_permission_ffi(callback: extern "C" fn(bool, *const c_char));
    fn free_notification_string_ffi(ptr: *mut c_char);
}

#[cfg(target_os = "macos")]
static PERMISSION_STATUS_RESULT: Mutex<Option<String>> = Mutex::new(None);

#[cfg(target_os = "macos")]
static PERMISSION_REQUEST_RESULT: Mutex<Option<(bool, String)>> = Mutex::new(None);

#[cfg(target_os = "macos")]
extern "C" fn check_permission_callback(status_ptr: *const c_char) {
    if status_ptr.is_null() {
        let mut result = PERMISSION_STATUS_RESULT.lock().unwrap();
        *result = Some("default".to_string());
        return;
    }

    unsafe {
        let status = CStr::from_ptr(status_ptr).to_string_lossy().into_owned();

        let mut result = PERMISSION_STATUS_RESULT.lock().unwrap();
        *result = Some(status);

        // Free the C string allocated by Objective-C
        free_notification_string_ffi(status_ptr as *mut c_char);
    }
}

#[cfg(target_os = "macos")]
extern "C" fn request_permission_callback(granted: bool, status_ptr: *const c_char) {
    eprintln!(
        "[Notifications] Callback received: granted={}, status_ptr={:?}",
        granted, status_ptr
    );

    let status = if status_ptr.is_null() {
        if granted {
            "granted".to_string()
        } else {
            "denied".to_string()
        }
    } else {
        unsafe {
            let s = CStr::from_ptr(status_ptr).to_string_lossy().into_owned();

            eprintln!("[Notifications] Status string: {}", s);

            // Free the C string allocated by Objective-C
            free_notification_string_ffi(status_ptr as *mut c_char);

            s
        }
    };

    eprintln!(
        "[Notifications] Setting result: granted={}, status={}",
        granted, status
    );
    let mut result = PERMISSION_REQUEST_RESULT.lock().unwrap();
    *result = Some((granted, status.clone()));
    eprintln!("[Notifications] Result set successfully");
}

#[tauri::command]
pub async fn check_notification_permission() -> Result<NotificationPermissionStatus, String> {
    #[cfg(target_os = "macos")]
    {
        use std::thread;
        use std::time::Duration;

        // Clear previous result
        {
            let mut result = PERMISSION_STATUS_RESULT.lock().unwrap();
            *result = None;
        }

        // Call Swift FFI
        unsafe {
            check_notification_permission_ffi(check_permission_callback);
        }

        // Wait for callback (with timeout)
        for _ in 0..50 {
            thread::sleep(Duration::from_millis(10));
            let result = PERMISSION_STATUS_RESULT.lock().unwrap();
            if let Some(status) = result.as_ref() {
                return Ok(NotificationPermissionStatus {
                    status: status.clone(),
                });
            }
        }

        // Timeout fallback
        Ok(NotificationPermissionStatus {
            status: "default".to_string(),
        })
    }

    #[cfg(not(target_os = "macos"))]
    {
        // On non-macOS platforms, return granted by default
        Ok(NotificationPermissionStatus {
            status: "granted".to_string(),
        })
    }
}

#[tauri::command]
pub async fn request_notification_permission() -> Result<NotificationPermissionResult, String> {
    #[cfg(target_os = "macos")]
    {
        use std::thread;
        use std::time::Duration;

        // Clear previous result
        {
            let mut result = PERMISSION_REQUEST_RESULT.lock().unwrap();
            *result = None;
        }

        // Call Swift FFI
        eprintln!("[Notifications] Calling request_notification_permission_ffi");
        unsafe {
            request_notification_permission_ffi(request_permission_callback);
        }

        // Wait for callback (with timeout of 30 seconds)
        for i in 0..3000 {
            thread::sleep(Duration::from_millis(10));
            let result = PERMISSION_REQUEST_RESULT.lock().unwrap();
            if let Some((granted, status)) = result.as_ref() {
                eprintln!(
                    "[Notifications] Permission result received: granted={}, status={}",
                    granted, status
                );

                // Normalize status string
                let normalized_status = if *granted {
                    "granted".to_string()
                } else if status.contains("not allowed")
                    || status.contains("denied")
                    || status.contains("Error Domain")
                {
                    // User explicitly denied or system blocked it
                    "denied".to_string()
                } else {
                    status.clone()
                };

                return Ok(NotificationPermissionResult {
                    granted: *granted,
                    status: normalized_status,
                });
            }

            // Log progress every 100 iterations (every 1 second)
            if i > 0 && i % 100 == 0 {
                eprintln!(
                    "[Notifications] Still waiting for permission response... ({}s)",
                    i / 100
                );
            }
        }

        // Timeout fallback
        eprintln!("[Notifications] Permission request timed out after 30 seconds");
        Err("Request timed out".to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        // On non-macOS platforms, return granted by default
        Ok(NotificationPermissionResult {
            granted: true,
            status: "granted".to_string(),
        })
    }
}
