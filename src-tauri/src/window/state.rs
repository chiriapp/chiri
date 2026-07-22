use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use std::collections::HashMap;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{Manager, PhysicalPosition, PhysicalSize, Runtime, WindowEvent};

const STATE_FILENAME: &str = "window-state.json";
const MIN_WIDTH: u32 = 320;
const MIN_HEIGHT: u32 = 240;

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq)]
pub struct WindowState {
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub maximized: bool,
}

impl WindowState {
    pub fn is_valid(&self) -> bool {
        self.width >= MIN_WIDTH && self.height >= MIN_HEIGHT
    }
}

#[derive(Default)]
pub struct WindowStateManager {
    states: Mutex<HashMap<String, WindowState>>,
}

impl WindowStateManager {
    pub fn load<R: Runtime>(app_handle: &tauri::AppHandle<R>) -> Self {
        let states = match Self::read_file(app_handle) {
            Ok(states) => states,
            Err(e) => {
                log::debug!("[WindowState] Failed to load window state: {e}");
                HashMap::new()
            }
        };
        Self {
            states: Mutex::new(states),
        }
    }

    fn read_file<R: Runtime>(
        app_handle: &tauri::AppHandle<R>,
    ) -> Result<HashMap<String, WindowState>, Box<dyn std::error::Error>> {
        let app_dir = app_handle.path().app_config_dir()?;
        let path = app_dir.join(STATE_FILENAME);
        let content = std::fs::read_to_string(&path)?;
        let states: HashMap<String, WindowState> = serde_json::from_str(&content)?;
        log::info!("[WindowState] Loaded state from {}", path.display());
        Ok(states)
    }

    pub fn save<R: Runtime>(&self, app_handle: &tauri::AppHandle<R>) {
        let app_dir = match app_handle.path().app_config_dir() {
            Ok(dir) => dir,
            Err(e) => {
                log::warn!("[WindowState] Failed to get app config dir: {e}");
                return;
            }
        };

        if let Err(e) = std::fs::create_dir_all(&app_dir) {
            log::warn!("[WindowState] Failed to create app config dir: {e}");
            return;
        }

        let path = app_dir.join(STATE_FILENAME);
        let states = self.states.lock();
        match serde_json::to_string_pretty(&*states) {
            Ok(content) => {
                if let Err(e) = std::fs::write(&path, content) {
                    log::warn!("[WindowState] Failed to write window state: {e}");
                } else {
                    log::info!("[WindowState] Saved state to {}", path.display());
                }
            }
            Err(e) => log::warn!("[WindowState] Failed to serialize window state: {e}"),
        }
    }

    pub fn update<R: Runtime>(&self, window: &tauri::Window<R>) {
        let Ok(size) = window.inner_size() else {
            return;
        };
        let Ok(position) = window.outer_position() else {
            return;
        };
        let maximized = window.is_maximized().unwrap_or_default();

        let mut states = self.states.lock();
        let state = states.entry(window.label().to_string()).or_default();
        state.width = size.width;
        state.height = size.height;
        state.x = position.x;
        state.y = position.y;
        state.maximized = maximized;
    }

    pub fn restore<R: Runtime>(&self, window: &tauri::Window<R>) {
        let state = {
            let states = self.states.lock();
            states.get(window.label()).copied()
        };

        let Some(state) = state else {
            return;
        };
        if !state.is_valid() {
            log::debug!("[WindowState] Ignoring invalid saved window state");
            return;
        }

        let position = PhysicalPosition {
            x: state.x,
            y: state.y,
        };
        let size = PhysicalSize {
            width: state.width,
            height: state.height,
        };

        let on_screen = window
            .available_monitors()
            .ok()
            .map(|monitors| {
                monitors.iter().any(|monitor| {
                    let monitor_position = monitor.position();
                    let monitor_size = monitor.size();
                    let left = monitor_position.x;
                    let right = monitor_position.x + monitor_size.width as i32;
                    let top = monitor_position.y;
                    let bottom = monitor_position.y + monitor_size.height as i32;
                    state.x >= left && state.x < right && state.y >= top && state.y < bottom
                })
            })
            .unwrap_or(true);

        if let Err(e) = window.set_size(size) {
            log::warn!("[WindowState] Failed to restore window size: {e}");
        }

        if on_screen {
            // wayland compositors generally ignore client-set position for
            // toplevel windows, so this is best-effort; the window may be
            // centered or placed according to the compositor's policy
            if let Err(e) = window.set_position(position) {
                log::warn!("[WindowState] Failed to restore window position: {e}");
            }
        } else {
            log::info!("[WindowState] Saved position is off-screen, using default position");
        }

        if state.maximized {
            let _ = window.maximize();
        }

        log::info!(
            "[WindowState] Restored main window to {}x{} at ({}, {}), maximized={}",
            state.width,
            state.height,
            state.x,
            state.y,
            state.maximized
        );
    }
}

pub fn manager<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
) -> tauri::State<'_, WindowStateManager> {
    app_handle.state::<WindowStateManager>()
}

pub fn handle_event<R: Runtime>(window: &tauri::Window<R>, event: &WindowEvent) {
    match event {
        WindowEvent::Resized(_) | WindowEvent::Moved(_) => {
            window
                .app_handle()
                .state::<WindowStateManager>()
                .update(window);
            schedule_save(window.app_handle());
        }
        _ => {}
    }
}

static SAVE_PENDING: AtomicBool = AtomicBool::new(false);

fn schedule_save<R: Runtime>(app_handle: &tauri::AppHandle<R>) {
    SAVE_PENDING.store(true, Ordering::SeqCst);
    let app_handle = app_handle.clone();
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(250));
        if SAVE_PENDING.swap(false, Ordering::SeqCst) {
            manager(&app_handle).save(&app_handle);
        }
    });
}
