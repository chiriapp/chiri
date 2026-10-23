use ksni::{menu::MenuItem, menu::StandardItem, ToolTip, Tray};
use tauri::{image::Image, AppHandle, Emitter, Manager};

use super::AppRuntime;
use crate::app::events::request_frontend_quit;

pub struct LinuxTray {
    app_handle: AppHandle<AppRuntime>,
    icon: ksni::Icon,
    pub(crate) last_sync: String,
    pub(crate) sync_enabled: bool,
    pub(crate) visible: bool,
}

impl LinuxTray {
    pub(crate) fn new(app_handle: AppHandle<AppRuntime>, image: Image<'static>) -> Self {
        let mut data = image.rgba().to_vec();
        for pixel in data.chunks_exact_mut(4) {
            pixel.rotate_right(1);
        }

        Self {
            app_handle,
            icon: ksni::Icon {
                width: image.width() as i32,
                height: image.height() as i32,
                data,
            },
            last_sync: "Last sync: Never".into(),
            sync_enabled: true,
            visible: true,
        }
    }

    fn show_window(&self) {
        if let Some(window) = self.app_handle.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

impl Tray for LinuxTray {
    fn id(&self) -> String {
        "Chiri".into()
    }

    fn title(&self) -> String {
        "Chiri".into()
    }

    fn status(&self) -> ksni::Status {
        if self.visible {
            ksni::Status::Active
        } else {
            ksni::Status::Passive
        }
    }

    fn icon_pixmap(&self) -> Vec<ksni::Icon> {
        vec![self.icon.clone()]
    }

    fn tool_tip(&self) -> ToolTip {
        ToolTip {
            title: "Chiri".into(),
            description: "Sync and manage tasks across CalDAV servers".into(),
            ..Default::default()
        }
    }

    fn activate(&mut self, _x: i32, _y: i32) {
        self.show_window();
    }

    fn menu(&self) -> Vec<MenuItem<Self>> {
        let show_app = self.app_handle.clone();
        let sync_app = self.app_handle.clone();
        let quit_app = self.app_handle.clone();

        vec![
            StandardItem {
                label: "Show Window".into(),
                activate: Box::new(move |_| {
                    if let Some(window) = show_app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }),
                ..Default::default()
            }
            .into(),
            MenuItem::Separator,
            StandardItem {
                label: self.last_sync.clone(),
                enabled: false,
                activate: Box::new(|_| {}),
                ..Default::default()
            }
            .into(),
            StandardItem {
                label: "Sync Now".into(),
                enabled: self.sync_enabled,
                activate: Box::new(move |_| {
                    let _ = sync_app.emit("tray-sync", ());
                }),
                ..Default::default()
            }
            .into(),
            MenuItem::Separator,
            StandardItem {
                label: "Quit".into(),
                activate: Box::new(move |_| {
                    request_frontend_quit(&quit_app);
                }),
                ..Default::default()
            }
            .into(),
        ]
    }
}
