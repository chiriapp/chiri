mod connector;
mod distributor;
mod registration;
mod state;
mod values;

use serde::Serialize;
use tauri::{AppHandle, State};
use tokio::{sync::oneshot, time::Duration};
use zbus::{Connection, Proxy};

use self::{
    distributor::{list_distributors, resolve_distributor},
    registration::{build_register_args, register_result_failed},
    state::ensure_runtime,
    values::{owned_value, VariantDict},
};

pub use state::UnifiedPushState;

const DISTRIBUTOR_PATH: &str = "/org/unifiedpush/Distributor";
const DISTRIBUTOR_INTERFACE: &str = "org.unifiedpush.Distributor2";
const REGISTRATION_TIMEOUT_SECONDS: u64 = 10;

#[derive(Debug, Clone, Serialize)]
pub struct KUnifiedPushRegistration {
    pub endpoint: String,
    pub token: String,
    pub distributor: String,
}

#[tauri::command]
pub async fn kunifiedpush_available() -> Result<bool, String> {
    let Ok(connection) = Connection::session().await else {
        return Ok(false);
    };
    Ok(!list_distributors(&connection).await?.is_empty())
}

#[tauri::command]
pub async fn kunifiedpush_register(
    app: AppHandle,
    state: State<'_, UnifiedPushState>,
    token: String,
    distributor: Option<String>,
    vapid_public_key: Option<String>,
    description: Option<String>,
) -> Result<KUnifiedPushRegistration, String> {
    let runtime = ensure_runtime(&app, &state).await?;
    let distributor = resolve_distributor(&runtime.connection, distributor.as_deref()).await?;
    let proxy = Proxy::new(
        &runtime.connection,
        distributor.as_str(),
        DISTRIBUTOR_PATH,
        DISTRIBUTOR_INTERFACE,
    )
    .await
    .map_err(|e| e.to_string())?;

    let (sender, receiver) = oneshot::channel();
    state.insert_pending_endpoint(token.clone(), sender)?;

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
            state.remove_pending_endpoint(&token);
            error.to_string()
        })?;

    if register_result_failed(&result) {
        state.remove_pending_endpoint(&token);
        return Err("UnifiedPush registration failed".into());
    }

    let endpoint =
        tokio::time::timeout(Duration::from_secs(REGISTRATION_TIMEOUT_SECONDS), receiver)
            .await
            .map_err(|_| {
                state.remove_pending_endpoint(&token);
                "Timed out waiting for UnifiedPush endpoint".to_string()
            })?
            .map_err(|_| "UnifiedPush endpoint channel closed".to_string())?;

    Ok(KUnifiedPushRegistration {
        endpoint,
        token,
        distributor,
    })
}

#[tauri::command]
pub async fn kunifiedpush_unregister(
    app: AppHandle,
    state: State<'_, UnifiedPushState>,
    token: String,
    distributor: Option<String>,
) -> Result<(), String> {
    let runtime = ensure_runtime(&app, &state).await?;
    let distributor = resolve_distributor(&runtime.connection, distributor.as_deref()).await?;
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
