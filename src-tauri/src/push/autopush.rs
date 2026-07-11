use std::{collections::HashMap, sync::Mutex, time::Duration};

use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State};
use tokio_tungstenite::{
    connect_async,
    tungstenite::{Error as WebSocketError, Message},
};

const CONNECTED_EVENT: &str = "mozilla-autopush://connected";
const ERROR_EVENT: &str = "mozilla-autopush://error";
const NOTIFICATION_EVENT: &str = "mozilla-autopush://notification";
const MAX_RECONNECT_DELAY_SECONDS: u64 = 30;

#[derive(Default)]
pub struct MozillaAutopushState {
    listeners: Mutex<HashMap<String, MozillaAutopushListener>>,
}

struct MozillaAutopushListener {
    websocket_url: String,
    uaid: String,
    channel_id: String,
    handle: tauri::async_runtime::JoinHandle<()>,
}

impl Drop for MozillaAutopushListener {
    fn drop(&mut self) {
        self.handle.abort();
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MozillaAutopushRegistration {
    uaid: String,
    channel_id: String,
    endpoint: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MozillaAutopushConnectedEvent {
    calendar_id: String,
    channel_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MozillaAutopushErrorEvent {
    calendar_id: String,
    channel_id: String,
    error: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MozillaAutopushNotificationEvent {
    calendar_id: String,
    channel_id: String,
    version: String,
    data: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct AutopushNotification {
    channel_id: String,
    version: String,
    data: Option<String>,
}

#[tauri::command]
pub async fn mozilla_autopush_available(websocket_url: String) -> Result<bool, String> {
    let Ok(mut socket) = connect_autopush_socket(&websocket_url).await else {
        return Ok(false);
    };

    let available = hello_autopush(&mut socket, None, None).await.is_ok();
    let _ = socket.close(None).await;
    Ok(available)
}

#[tauri::command]
pub async fn mozilla_autopush_register(
    websocket_url: String,
    uaid: Option<String>,
    channel_id: String,
    vapid_public_key: Option<String>,
) -> Result<MozillaAutopushRegistration, String> {
    validate_channel_id(&channel_id)?;

    let mut socket = connect_autopush_socket(&websocket_url).await?;
    let registered_uaid = hello_autopush(&mut socket, uaid.as_deref(), None).await?;
    let endpoint =
        register_autopush_channel(&mut socket, &channel_id, vapid_public_key.as_deref()).await?;
    let _ = socket.close(None).await;

    Ok(MozillaAutopushRegistration {
        uaid: registered_uaid,
        channel_id,
        endpoint,
    })
}

#[tauri::command]
pub async fn mozilla_autopush_restore(
    websocket_url: String,
    uaid: String,
    channel_id: String,
) -> Result<String, String> {
    validate_channel_id(&channel_id)?;

    let mut socket = connect_autopush_socket(&websocket_url).await?;
    let restored_uaid = hello_autopush(
        &mut socket,
        Some(&uaid),
        Some(std::slice::from_ref(&channel_id)),
    )
    .await?;
    let _ = socket.close(None).await;

    if restored_uaid == uaid {
        Ok(restored_uaid)
    } else {
        Err("Mozilla Autopush reassigned the stored UAID".to_string())
    }
}

#[tauri::command]
pub async fn mozilla_autopush_unregister(
    websocket_url: String,
    uaid: String,
    channel_id: String,
) -> Result<(), String> {
    validate_channel_id(&channel_id)?;

    let mut socket = connect_autopush_socket(&websocket_url).await?;
    hello_autopush(
        &mut socket,
        Some(&uaid),
        Some(std::slice::from_ref(&channel_id)),
    )
    .await?;
    unregister_autopush_channel(&mut socket, &channel_id).await?;
    let _ = socket.close(None).await;
    Ok(())
}

#[tauri::command]
pub fn start_mozilla_autopush_listener(
    app: AppHandle,
    state: State<'_, MozillaAutopushState>,
    calendar_id: String,
    websocket_url: String,
    uaid: String,
    channel_id: String,
) -> Result<(), String> {
    validate_channel_id(&channel_id)?;
    validate_websocket_url(&websocket_url)?;

    let mut listeners = state
        .listeners
        .lock()
        .map_err(|_| "Mozilla Autopush state lock poisoned".to_string())?;

    if listeners.get(&calendar_id).is_some_and(|listener| {
        listener.websocket_url == websocket_url
            && listener.uaid == uaid
            && listener.channel_id == channel_id
    }) {
        return Ok(());
    }

    listeners.remove(&calendar_id);

    let handle = tauri::async_runtime::spawn(run_autopush_listener(
        app,
        calendar_id.clone(),
        websocket_url.clone(),
        uaid.clone(),
        channel_id.clone(),
    ));

    listeners.insert(
        calendar_id,
        MozillaAutopushListener {
            websocket_url,
            uaid,
            channel_id,
            handle,
        },
    );

    Ok(())
}

#[tauri::command]
pub fn stop_mozilla_autopush_listener(
    state: State<'_, MozillaAutopushState>,
    calendar_id: String,
) -> Result<(), String> {
    let mut listeners = state
        .listeners
        .lock()
        .map_err(|_| "Mozilla Autopush state lock poisoned".to_string())?;
    listeners.remove(&calendar_id);
    Ok(())
}

#[tauri::command]
pub fn stop_all_mozilla_autopush_listeners(
    state: State<'_, MozillaAutopushState>,
) -> Result<(), String> {
    let mut listeners = state
        .listeners
        .lock()
        .map_err(|_| "Mozilla Autopush state lock poisoned".to_string())?;
    listeners.clear();
    Ok(())
}

async fn run_autopush_listener(
    app: AppHandle,
    calendar_id: String,
    websocket_url: String,
    uaid: String,
    channel_id: String,
) {
    let mut reconnect_delay = Duration::from_secs(1);
    let channel_ids = [channel_id.clone()];

    loop {
        match connect_and_read_autopush(
            &app,
            &calendar_id,
            &websocket_url,
            &uaid,
            &channel_id,
            &channel_ids,
        )
        .await
        {
            Ok(()) => emit_error(
                &app,
                &calendar_id,
                &channel_id,
                "Mozilla Autopush connection closed",
            ),
            Err(error) => emit_error(&app, &calendar_id, &channel_id, error),
        }

        tokio::time::sleep(reconnect_delay).await;
        reconnect_delay =
            (reconnect_delay * 2).min(Duration::from_secs(MAX_RECONNECT_DELAY_SECONDS));
    }
}

async fn connect_and_read_autopush(
    app: &AppHandle,
    calendar_id: &str,
    websocket_url: &str,
    uaid: &str,
    channel_id: &str,
    channel_ids: &[String],
) -> Result<(), String> {
    let mut socket = connect_autopush_socket(websocket_url).await?;
    hello_autopush(&mut socket, Some(uaid), Some(channel_ids)).await?;

    let _ = app.emit(
        CONNECTED_EVENT,
        MozillaAutopushConnectedEvent {
            calendar_id: calendar_id.to_string(),
            channel_id: channel_id.to_string(),
        },
    );

    while let Some(value) = read_autopush_json(&mut socket).await? {
        if is_protocol_ping(&value) {
            send_autopush_json(&mut socket, json!({})).await?;
            continue;
        }

        if let Some(notification) = parse_notification(&value) {
            send_autopush_json(
                &mut socket,
                build_ack(&notification.channel_id, &notification.version),
            )
            .await?;

            if notification.channel_id == channel_id {
                let _ = app.emit(
                    NOTIFICATION_EVENT,
                    MozillaAutopushNotificationEvent {
                        calendar_id: calendar_id.to_string(),
                        channel_id: notification.channel_id,
                        version: notification.version,
                        data: notification.data,
                    },
                );
            }
        }
    }

    Ok(())
}

async fn connect_autopush_socket(
    websocket_url: &str,
) -> Result<
    tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
    String,
> {
    validate_websocket_url(websocket_url)?;
    let (socket, _) = connect_async(websocket_url)
        .await
        .map_err(format_websocket_error)?;
    Ok(socket)
}

async fn hello_autopush(
    socket: &mut tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
    uaid: Option<&str>,
    channel_ids: Option<&[String]>,
) -> Result<String, String> {
    let mut hello = json!({
        "messageType": "hello",
        "uaid": uaid,
    });

    if let Some(channel_ids) = channel_ids {
        hello["channelIDs"] = json!(channel_ids);
    }

    send_autopush_json(socket, hello).await?;

    while let Some(value) = read_autopush_json(socket).await? {
        if is_protocol_ping(&value) {
            continue;
        }

        if value.get("messageType").and_then(Value::as_str) != Some("hello") {
            continue;
        }

        let status = value.get("status").and_then(Value::as_u64).unwrap_or(0);
        if status != 200 {
            return Err(format!("Mozilla Autopush hello returned status {status}"));
        }

        return value
            .get("uaid")
            .and_then(Value::as_str)
            .map(ToOwned::to_owned)
            .ok_or_else(|| "Mozilla Autopush hello omitted uaid".to_string());
    }

    Err("Mozilla Autopush closed before hello".to_string())
}

async fn register_autopush_channel(
    socket: &mut tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
    channel_id: &str,
    vapid_public_key: Option<&str>,
) -> Result<String, String> {
    let mut register = json!({
        "messageType": "register",
        "channelID": channel_id,
    });

    if let Some(vapid_public_key) = vapid_public_key {
        register["key"] = json!(vapid_public_key);
    }

    send_autopush_json(socket, register).await?;

    while let Some(value) = read_autopush_json(socket).await? {
        if is_protocol_ping(&value) {
            continue;
        }

        if value.get("messageType").and_then(Value::as_str) != Some("register") {
            continue;
        }

        let status = value.get("status").and_then(Value::as_u64).unwrap_or(0);
        if status != 200 {
            return Err(format!(
                "Mozilla Autopush register returned status {status}"
            ));
        }

        return value
            .get("pushEndpoint")
            .and_then(Value::as_str)
            .map(ToOwned::to_owned)
            .ok_or_else(|| "Mozilla Autopush register omitted pushEndpoint".to_string());
    }

    Err("Mozilla Autopush closed before register response".to_string())
}

async fn unregister_autopush_channel(
    socket: &mut tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
    channel_id: &str,
) -> Result<(), String> {
    send_autopush_json(
        socket,
        json!({
            "messageType": "unregister",
            "channelID": channel_id,
        }),
    )
    .await?;

    while let Some(value) = read_autopush_json(socket).await? {
        if is_protocol_ping(&value) {
            continue;
        }

        if value.get("messageType").and_then(Value::as_str) != Some("unregister") {
            continue;
        }

        let status = value.get("status").and_then(Value::as_u64).unwrap_or(0);
        return if status == 200 {
            Ok(())
        } else {
            Err(format!(
                "Mozilla Autopush unregister returned status {status}"
            ))
        };
    }

    Err("Mozilla Autopush closed before unregister response".to_string())
}

async fn send_autopush_json(
    socket: &mut tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
    value: Value,
) -> Result<(), String> {
    socket
        .send(Message::Text(value.to_string().into()))
        .await
        .map_err(format_websocket_error)
}

async fn read_autopush_json(
    socket: &mut tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
) -> Result<Option<Value>, String> {
    while let Some(message) = socket.next().await {
        match message.map_err(format_websocket_error)? {
            Message::Text(text) => {
                return serde_json::from_str(&text)
                    .map(Some)
                    .map_err(|error| error.to_string());
            }
            Message::Binary(bytes) => {
                return serde_json::from_slice(&bytes)
                    .map(Some)
                    .map_err(|error| error.to_string());
            }
            Message::Ping(bytes) => socket
                .send(Message::Pong(bytes))
                .await
                .map_err(format_websocket_error)?,
            Message::Pong(_) => {}
            Message::Close(_) => return Ok(None),
            Message::Frame(_) => {}
        }
    }

    Ok(None)
}

fn build_ack(channel_id: &str, version: &str) -> Value {
    json!({
        "messageType": "ack",
        "updates": [
            {
                "channelID": channel_id,
                "version": version,
            }
        ],
    })
}

fn parse_notification(value: &Value) -> Option<AutopushNotification> {
    if value.get("messageType").and_then(Value::as_str) != Some("notification") {
        return None;
    }

    Some(AutopushNotification {
        channel_id: value.get("channelID")?.as_str()?.to_string(),
        version: value.get("version")?.as_str()?.to_string(),
        data: value
            .get("data")
            .and_then(Value::as_str)
            .map(ToOwned::to_owned),
    })
}

fn is_protocol_ping(value: &Value) -> bool {
    value.as_object().is_some_and(|object| object.is_empty())
        || value.get("messageType").and_then(Value::as_str) == Some("ping")
}

fn validate_websocket_url(websocket_url: &str) -> Result<(), String> {
    let parsed_url = reqwest::Url::parse(websocket_url).map_err(|error| error.to_string())?;
    if !matches!(parsed_url.scheme(), "ws" | "wss") {
        return Err(format!(
            "unsupported Mozilla Autopush websocket URL scheme {}",
            parsed_url.scheme()
        ));
    }

    Ok(())
}

fn validate_channel_id(channel_id: &str) -> Result<(), String> {
    let parsed = uuid::Uuid::parse_str(channel_id)
        .map_err(|_| format!("invalid Mozilla Autopush channel ID {channel_id}"))?;
    if parsed.hyphenated().to_string() != channel_id {
        return Err(format!(
            "Mozilla Autopush channel ID must be lower-case dashed UUID: {channel_id}"
        ));
    }

    Ok(())
}

fn format_websocket_error(error: WebSocketError) -> String {
    error.to_string()
}

fn emit_error(app: &AppHandle, calendar_id: &str, channel_id: &str, error: impl ToString) {
    let _ = app.emit(
        ERROR_EVENT,
        MozillaAutopushErrorEvent {
            calendar_id: calendar_id.to_string(),
            channel_id: channel_id.to_string(),
            error: error.to_string(),
        },
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_autopush_notification() {
        let value = json!({
            "messageType": "notification",
            "channelID": "123e4567-e89b-12d3-a456-426614174000",
            "version": "42",
            "data": "hello",
        });

        assert_eq!(
            parse_notification(&value),
            Some(AutopushNotification {
                channel_id: "123e4567-e89b-12d3-a456-426614174000".to_string(),
                version: "42".to_string(),
                data: Some("hello".to_string()),
            })
        );
    }

    #[test]
    fn builds_autopush_ack() {
        assert_eq!(
            build_ack("123e4567-e89b-12d3-a456-426614174000", "42"),
            json!({
                "messageType": "ack",
                "updates": [
                    {
                        "channelID": "123e4567-e89b-12d3-a456-426614174000",
                        "version": "42",
                    }
                ],
            })
        );
    }

    #[test]
    fn recognizes_autopush_protocol_ping_forms() {
        assert!(is_protocol_ping(&json!({})));
        assert!(is_protocol_ping(&json!({ "messageType": "ping" })));
        assert!(!is_protocol_ping(&json!({ "messageType": "notification" })));
    }

    #[test]
    fn validates_lowercase_dashed_channel_ids() {
        assert!(validate_channel_id("123e4567-e89b-12d3-a456-426614174000").is_ok());
        assert!(validate_channel_id("123E4567-E89B-12D3-A456-426614174000").is_err());
        assert!(validate_channel_id("not-a-uuid").is_err());
    }
}
