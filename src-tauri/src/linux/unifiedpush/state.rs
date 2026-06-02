use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use gtk::gio;
use tauri::{AppHandle, State};
use tokio::sync::oneshot;
use zbus::Connection;

use super::connector::{gtk_application_dbus_connection, register_connector};

pub(super) type PendingEndpoints = Arc<Mutex<HashMap<String, oneshot::Sender<String>>>>;

pub(super) struct UnifiedPushRuntime {
    pub(super) connection: Connection,
    pub(super) service_name: String,
}

struct ConnectorRegistration {
    _connection: gio::DBusConnection,
    _registration_id: gio::RegistrationId,
}

pub struct UnifiedPushState {
    runtime: tokio::sync::Mutex<Option<UnifiedPushRuntime>>,
    connector_registration: Mutex<Option<ConnectorRegistration>>,
    pending_endpoints: PendingEndpoints,
}

impl Default for UnifiedPushState {
    fn default() -> Self {
        Self {
            runtime: tokio::sync::Mutex::new(None),
            connector_registration: Mutex::new(None),
            pending_endpoints: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl UnifiedPushState {
    pub fn ensure_connector(&self, app: &AppHandle) -> Result<String, String> {
        let service_name = app.config().identifier.clone();
        let mut connector_registration = self
            .connector_registration
            .lock()
            .map_err(|_| "UnifiedPush connector state lock poisoned".to_string())?;

        if connector_registration.is_none() {
            let connection = gtk_application_dbus_connection(app)?;
            let registration_id =
                register_connector(app.clone(), &connection, self.pending_endpoints.clone())?;
            *connector_registration = Some(ConnectorRegistration {
                _connection: connection,
                _registration_id: registration_id,
            });
            log::info!(
                "[UnifiedPush] Connector registered on D-Bus service {}",
                service_name
            );
        }

        Ok(service_name)
    }

    pub(super) fn insert_pending_endpoint(
        &self,
        token: String,
        sender: oneshot::Sender<String>,
    ) -> Result<(), String> {
        let mut pending = self
            .pending_endpoints
            .lock()
            .map_err(|_| "UnifiedPush endpoint state lock poisoned".to_string())?;
        pending.insert(token, sender);
        Ok(())
    }

    pub(super) fn remove_pending_endpoint(&self, token: &str) {
        if let Ok(mut pending) = self.pending_endpoints.lock() {
            pending.remove(token);
        }
    }
}

pub(super) async fn ensure_runtime(
    app: &AppHandle,
    state: &State<'_, UnifiedPushState>,
) -> Result<UnifiedPushRuntime, String> {
    let service_name = state.ensure_connector(app)?;
    let mut runtime = state.runtime.lock().await;
    if let Some(runtime) = runtime.as_ref() {
        return Ok(UnifiedPushRuntime {
            connection: runtime.connection.clone(),
            service_name: runtime.service_name.clone(),
        });
    }

    let connection = Connection::session().await.map_err(|e| e.to_string())?;

    let created = UnifiedPushRuntime {
        connection: connection.clone(),
        service_name,
    };

    *runtime = Some(UnifiedPushRuntime {
        connection,
        service_name: created.service_name.clone(),
    });

    Ok(created)
}
