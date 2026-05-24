use serde::Serialize;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, Emitter, State};
use tokio::{sync::oneshot, time::Duration};
use zbus::{
    fdo::DBusProxy,
    interface,
    zvariant::{OwnedValue, Value},
    Connection, Proxy,
};

const CONNECTOR_PATH: &str = "/org/unifiedpush/Connector";
const DISTRIBUTOR_PATH: &str = "/org/unifiedpush/Distributor";
const DISTRIBUTOR_INTERFACE: &str = "org.unifiedpush.Distributor2";
const DISTRIBUTOR_PREFIX: &str = "org.unifiedpush.Distributor.";
const MESSAGE_EVENT: &str = "unifiedpush://message";
const REGISTRATION_TIMEOUT_SECONDS: u64 = 10;

type VariantDict = HashMap<String, OwnedValue>;
type PendingEndpoints = Arc<Mutex<HashMap<String, oneshot::Sender<String>>>>;

#[derive(Debug, Clone, Serialize)]
pub struct LinuxUnifiedPushRegistration {
    pub endpoint: String,
    pub token: String,
    pub distributor: String,
}

#[derive(Debug, Clone, Serialize)]
struct LinuxUnifiedPushMessageEvent {
    token: String,
    message: String,
}

#[derive(Clone)]
struct UnifiedPushConnector {
    app: AppHandle,
    pending_endpoints: PendingEndpoints,
}

#[interface(name = "org.unifiedpush.Connector2")]
impl UnifiedPushConnector {
    #[zbus(name = "Message")]
    async fn message(&self, args: VariantDict) -> zbus::fdo::Result<VariantDict> {
        let Some(token) = get_string(&args, "token") else {
            return Ok(VariantDict::new());
        };

        let message_len = get_bytes(&args, "message")
            .map(|bytes| bytes.len())
            .unwrap_or(0);
        let message = format!("Linux UnifiedPush message ({message_len} bytes)");

        let _ = self.app.emit(
            MESSAGE_EVENT,
            LinuxUnifiedPushMessageEvent { token, message },
        );

        let mut response = VariantDict::new();
        if let Some(id) = get_string(&args, "id") {
            response.insert("id".into(), owned_value(id)?);
        }

        Ok(response)
    }

    #[zbus(name = "NewEndpoint")]
    async fn new_endpoint(&self, args: VariantDict) -> zbus::fdo::Result<VariantDict> {
        let Some(token) = get_string(&args, "token") else {
            return Ok(VariantDict::new());
        };
        let Some(endpoint) = get_string(&args, "endpoint") else {
            return Ok(VariantDict::new());
        };

        if let Ok(mut pending) = self.pending_endpoints.lock() {
            if let Some(sender) = pending.remove(&token) {
                let _ = sender.send(endpoint);
            }
        }

        Ok(VariantDict::new())
    }

    #[zbus(name = "Unregistered")]
    async fn unregistered(&self, args: VariantDict) -> zbus::fdo::Result<VariantDict> {
        if let Some(token) = get_string(&args, "token") {
            if let Ok(mut pending) = self.pending_endpoints.lock() {
                pending.remove(&token);
            }
        }

        Ok(VariantDict::new())
    }
}

struct UnifiedPushRuntime {
    connection: Connection,
    service_name: String,
}

pub struct UnifiedPushState {
    runtime: tokio::sync::Mutex<Option<UnifiedPushRuntime>>,
    pending_endpoints: PendingEndpoints,
}

impl Default for UnifiedPushState {
    fn default() -> Self {
        Self {
            runtime: tokio::sync::Mutex::new(None),
            pending_endpoints: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

fn owned_value(value: impl Into<Value<'static>>) -> zbus::fdo::Result<OwnedValue> {
    value
        .into()
        .try_into()
        .map_err(|error| zbus::fdo::Error::Failed(format!("Invalid D-Bus value: {error}")))
}

fn get_string(args: &VariantDict, key: &str) -> Option<String> {
    args.get(key)
        .and_then(|value| <&str>::try_from(value).ok())
        .map(ToString::to_string)
}

fn get_bytes(args: &VariantDict, key: &str) -> Option<Vec<u8>> {
    args.get(key)
        .and_then(|value| value.try_clone().ok())
        .and_then(|value| value.try_into().ok())
}

async fn list_distributors(connection: &Connection) -> Result<Vec<String>, String> {
    let proxy = DBusProxy::new(connection)
        .await
        .map_err(|e| e.to_string())?;
    let mut names: Vec<String> = proxy
        .list_names()
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|name| name.to_string())
        .filter(|name| name.starts_with(DISTRIBUTOR_PREFIX))
        .collect();

    let activatable = proxy
        .list_activatable_names()
        .await
        .map_err(|e| e.to_string())?;
    names.extend(
        activatable
            .into_iter()
            .map(|name| name.to_string())
            .filter(|name| name.starts_with(DISTRIBUTOR_PREFIX)),
    );

    names.sort();
    names.dedup();
    Ok(names)
}

async fn choose_distributor(connection: &Connection) -> Result<String, String> {
    let distributors = list_distributors(connection).await?;
    if distributors.is_empty() {
        return Err("No UnifiedPush distributor is available".into());
    }

    if let Ok(preferred) = std::env::var("UNIFIEDPUSH_DISTRIBUTOR") {
        if preferred.starts_with(DISTRIBUTOR_PREFIX)
            && distributors.iter().any(|name| name == &preferred)
        {
            return Ok(preferred);
        }
    }

    Ok(distributors[0].clone())
}

async fn ensure_runtime(
    app: &AppHandle,
    state: &State<'_, UnifiedPushState>,
) -> Result<UnifiedPushRuntime, String> {
    let mut runtime = state.runtime.lock().await;
    if let Some(runtime) = runtime.as_ref() {
        return Ok(UnifiedPushRuntime {
            connection: runtime.connection.clone(),
            service_name: runtime.service_name.clone(),
        });
    }

    let connection = Connection::session().await.map_err(|e| e.to_string())?;
    let service_name = app.config().identifier.clone();
    let connector = UnifiedPushConnector {
        app: app.clone(),
        pending_endpoints: state.pending_endpoints.clone(),
    };

    connection
        .object_server()
        .at(CONNECTOR_PATH, connector)
        .await
        .map_err(|e| e.to_string())?;
    connection
        .request_name(service_name.as_str())
        .await
        .map_err(|e| e.to_string())?;

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

fn build_register_args(
    service_name: &str,
    token: &str,
    vapid_public_key: Option<&str>,
    description: Option<&str>,
) -> Result<VariantDict, String> {
    let mut args = VariantDict::new();
    args.insert(
        "service".into(),
        owned_value(service_name.to_string()).map_err(|e| e.to_string())?,
    );
    args.insert(
        "token".into(),
        owned_value(token.to_string()).map_err(|e| e.to_string())?,
    );

    if let Some(description) = description.filter(|value| !value.trim().is_empty()) {
        args.insert(
            "description".into(),
            owned_value(description.to_string()).map_err(|e| e.to_string())?,
        );
    }

    if let Some(vapid) = vapid_public_key.filter(|value| !value.trim().is_empty()) {
        args.insert(
            "vapid".into(),
            owned_value(vapid.to_string()).map_err(|e| e.to_string())?,
        );
    }

    Ok(args)
}

fn register_result_failed(result: &VariantDict) -> bool {
    get_string(result, "success")
        .map(|success| success == "REGISTRATION_FAILED")
        .unwrap_or(false)
}

#[tauri::command]
pub async fn linux_unifiedpush_available() -> Result<bool, String> {
    let Ok(connection) = Connection::session().await else {
        return Ok(false);
    };
    Ok(!list_distributors(&connection).await?.is_empty())
}

#[tauri::command]
pub async fn linux_unifiedpush_register(
    app: AppHandle,
    state: State<'_, UnifiedPushState>,
    token: String,
    vapid_public_key: Option<String>,
    description: Option<String>,
) -> Result<LinuxUnifiedPushRegistration, String> {
    let runtime = ensure_runtime(&app, &state).await?;
    let distributor = choose_distributor(&runtime.connection).await?;
    let proxy = Proxy::new(
        &runtime.connection,
        distributor.as_str(),
        DISTRIBUTOR_PATH,
        DISTRIBUTOR_INTERFACE,
    )
    .await
    .map_err(|e| e.to_string())?;

    let (sender, receiver) = oneshot::channel();
    {
        let mut pending = state
            .pending_endpoints
            .lock()
            .map_err(|_| "UnifiedPush endpoint state lock poisoned".to_string())?;
        pending.insert(token.clone(), sender);
    }

    let args = build_register_args(
        &runtime.service_name,
        &token,
        vapid_public_key.as_deref(),
        description.as_deref(),
    )?;

    let result = proxy
        .call::<_, _, VariantDict>("Register", &args)
        .await
        .map_err(|error| {
            if let Ok(mut pending) = state.pending_endpoints.lock() {
                pending.remove(&token);
            }
            error.to_string()
        })?;

    if register_result_failed(&result) {
        if let Ok(mut pending) = state.pending_endpoints.lock() {
            pending.remove(&token);
        }
        return Err("UnifiedPush registration failed".into());
    }

    let endpoint =
        tokio::time::timeout(Duration::from_secs(REGISTRATION_TIMEOUT_SECONDS), receiver)
            .await
            .map_err(|_| {
                if let Ok(mut pending) = state.pending_endpoints.lock() {
                    pending.remove(&token);
                }
                "Timed out waiting for UnifiedPush endpoint".to_string()
            })?
            .map_err(|_| "UnifiedPush endpoint channel closed".to_string())?;

    Ok(LinuxUnifiedPushRegistration {
        endpoint,
        token,
        distributor,
    })
}

#[tauri::command]
pub async fn linux_unifiedpush_unregister(
    app: AppHandle,
    state: State<'_, UnifiedPushState>,
    token: String,
) -> Result<(), String> {
    let runtime = ensure_runtime(&app, &state).await?;
    let distributor = choose_distributor(&runtime.connection).await?;
    let proxy = Proxy::new(
        &runtime.connection,
        distributor.as_str(),
        DISTRIBUTOR_PATH,
        DISTRIBUTOR_INTERFACE,
    )
    .await
    .map_err(|e| e.to_string())?;

    let mut args = VariantDict::new();
    args.insert(
        "token".into(),
        owned_value(token.clone()).map_err(|e| e.to_string())?,
    );

    proxy
        .call::<_, _, VariantDict>("Unregister", &args)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}
