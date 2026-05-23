#[cfg(target_os = "macos")]
mod imp {
    use std::ffi::CStr;
    use std::os::raw::{c_char, c_int};
    use std::ptr;

    #[link(name = "macos_ffi", kind = "static")]
    extern "C" {
        fn chiri_macos_login_item_status() -> c_int;
        fn chiri_macos_login_item_enable(error: *mut *mut c_char) -> c_int;
        fn chiri_macos_login_item_disable(error: *mut *mut c_char) -> c_int;
        fn chiri_macos_login_item_free_string(value: *mut c_char);
    }

    fn status_name(status: c_int) -> &'static str {
        match status {
            1 => "enabled",
            2 => "requires_approval",
            3 => "not_found",
            -1 => "unsupported",
            _ => "disabled",
        }
    }

    fn take_error(error: *mut c_char) -> String {
        if error.is_null() {
            return "Unknown login item error".to_string();
        }

        let message = unsafe { CStr::from_ptr(error) }
            .to_string_lossy()
            .into_owned();
        unsafe { chiri_macos_login_item_free_string(error) };
        message
    }

    fn run_login_item_update(
        update: unsafe extern "C" fn(*mut *mut c_char) -> c_int,
    ) -> Result<String, String> {
        let mut error = ptr::null_mut();
        let success = unsafe { update(&mut error) };

        if success == 0 {
            return Err(take_error(error));
        }

        Ok(status_name(unsafe { chiri_macos_login_item_status() }).to_string())
    }

    pub fn status() -> String {
        status_name(unsafe { chiri_macos_login_item_status() }).to_string()
    }

    pub fn enable() -> Result<String, String> {
        run_login_item_update(chiri_macos_login_item_enable)
    }

    pub fn disable() -> Result<String, String> {
        run_login_item_update(chiri_macos_login_item_disable)
    }
}

#[cfg(not(target_os = "macos"))]
mod imp {
    pub fn status() -> String {
        "unsupported".to_string()
    }

    pub fn enable() -> Result<String, String> {
        Err("Native login items are only available on macOS.".to_string())
    }

    pub fn disable() -> Result<String, String> {
        Err("Native login items are only available on macOS.".to_string())
    }
}

#[tauri::command]
pub async fn get_macos_launch_at_login_status() -> String {
    imp::status()
}

#[tauri::command]
pub async fn enable_macos_launch_at_login() -> Result<String, String> {
    imp::enable()
}

#[tauri::command]
pub async fn disable_macos_launch_at_login() -> Result<String, String> {
    imp::disable()
}
