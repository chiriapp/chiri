use std::{collections::HashMap, sync::Mutex, time::Duration};

use reqwest::header::ACCEPT;
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

const CONNECTED_EVENT: &str = "ntfy://connected";
const ERROR_EVENT: &str = "ntfy://error";
const SSE_EVENT: &str = "ntfy://event";
const MAX_RECONNECT_DELAY_SECONDS: u64 = 30;
const MAX_SSE_BUFFER_BYTES: usize = 256 * 1024;
const MAX_SSE_EVENT_DATA_BYTES: usize = 128 * 1024;

#[derive(Default)]
pub struct NtfySseState {
    listeners: Mutex<HashMap<String, NtfySseListener>>,
}

struct NtfySseListener {
    topic: String,
    sse_url: String,
    handle: tauri::async_runtime::JoinHandle<()>,
}

impl Drop for NtfySseListener {
    fn drop(&mut self) {
        self.handle.abort();
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NtfyConnectedEvent {
    calendar_id: String,
    topic: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NtfyErrorEvent {
    calendar_id: String,
    topic: String,
    error: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NtfySseEvent {
    calendar_id: String,
    topic: String,
    data: String,
}

#[tauri::command]
pub fn start_ntfy_sse_listener(
    app: AppHandle,
    state: State<'_, NtfySseState>,
    calendar_id: String,
    topic: String,
    sse_url: String,
) -> Result<(), String> {
    let parsed_url = reqwest::Url::parse(&sse_url).map_err(|error| error.to_string())?;
    if !matches!(parsed_url.scheme(), "http" | "https") {
        return Err(format!(
            "unsupported ntfy SSE URL scheme {}",
            parsed_url.scheme()
        ));
    }

    let mut listeners = state
        .listeners
        .lock()
        .map_err(|_| "ntfy SSE state lock poisoned".to_string())?;

    if listeners
        .get(&calendar_id)
        .is_some_and(|listener| listener.topic == topic && listener.sse_url == sse_url)
    {
        return Ok(());
    }

    listeners.remove(&calendar_id);

    let handle = tauri::async_runtime::spawn(run_ntfy_sse_listener(
        app,
        calendar_id.clone(),
        topic.clone(),
        sse_url.clone(),
    ));

    listeners.insert(
        calendar_id,
        NtfySseListener {
            topic,
            sse_url,
            handle,
        },
    );

    Ok(())
}

#[tauri::command]
pub fn stop_ntfy_sse_listener(
    state: State<'_, NtfySseState>,
    calendar_id: String,
) -> Result<(), String> {
    let mut listeners = state
        .listeners
        .lock()
        .map_err(|_| "ntfy SSE state lock poisoned".to_string())?;
    listeners.remove(&calendar_id);
    Ok(())
}

#[tauri::command]
pub fn stop_all_ntfy_sse_listeners(state: State<'_, NtfySseState>) -> Result<(), String> {
    let mut listeners = state
        .listeners
        .lock()
        .map_err(|_| "ntfy SSE state lock poisoned".to_string())?;
    listeners.clear();
    Ok(())
}

async fn run_ntfy_sse_listener(
    app: AppHandle,
    calendar_id: String,
    topic: String,
    sse_url: String,
) {
    let client = match reqwest::Client::builder().build() {
        Ok(client) => client,
        Err(error) => {
            emit_error(&app, &calendar_id, &topic, error);
            return;
        }
    };

    let mut reconnect_delay = Duration::from_secs(1);

    loop {
        match connect_and_read(&app, &client, &calendar_id, &topic, &sse_url).await {
            Ok(()) => emit_error(&app, &calendar_id, &topic, "ntfy SSE connection closed"),
            Err(error) => emit_error(&app, &calendar_id, &topic, error),
        }

        tokio::time::sleep(reconnect_delay).await;
        reconnect_delay =
            (reconnect_delay * 2).min(Duration::from_secs(MAX_RECONNECT_DELAY_SECONDS));
    }
}

async fn connect_and_read(
    app: &AppHandle,
    client: &reqwest::Client,
    calendar_id: &str,
    topic: &str,
    sse_url: &str,
) -> Result<(), String> {
    let mut response = client
        .get(sse_url)
        .header(ACCEPT, "text/event-stream")
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!("ntfy SSE returned HTTP {}", response.status()));
    }

    let _ = app.emit(
        CONNECTED_EVENT,
        NtfyConnectedEvent {
            calendar_id: calendar_id.to_string(),
            topic: topic.to_string(),
        },
    );

    let mut buffer = String::new();

    while let Some(chunk) = response.chunk().await.map_err(|error| error.to_string())? {
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(block) = next_sse_block(&mut buffer)? {
            if let Some(data) = parse_sse_data(&block)? {
                let _ = app.emit(
                    SSE_EVENT,
                    NtfySseEvent {
                        calendar_id: calendar_id.to_string(),
                        topic: topic.to_string(),
                        data,
                    },
                );
            }
        }
    }

    if buffer.is_empty() {
        Ok(())
    } else if buffer.len() > MAX_SSE_BUFFER_BYTES {
        Err(format!(
            "ntfy SSE stream ended with an unterminated event over {MAX_SSE_BUFFER_BYTES} bytes"
        ))
    } else {
        Ok(())
    }
}

fn next_sse_block(buffer: &mut String) -> Result<Option<String>, String> {
    let separator = match (buffer.find("\r\n\r\n"), buffer.find("\n\n")) {
        (Some(crlf), Some(lf)) if crlf < lf => ("\r\n\r\n", crlf),
        (Some(crlf), None) => ("\r\n\r\n", crlf),
        (_, Some(lf)) => ("\n\n", lf),
        (None, None) => {
            if buffer.len() > MAX_SSE_BUFFER_BYTES {
                return Err(format!(
                    "ntfy SSE event exceeded the {MAX_SSE_BUFFER_BYTES} byte buffer limit"
                ));
            }
            return Ok(None);
        }
    };

    if separator.1 > MAX_SSE_BUFFER_BYTES {
        buffer.drain(..separator.1 + separator.0.len());
        return Err(format!(
            "ntfy SSE event exceeded the {MAX_SSE_BUFFER_BYTES} byte buffer limit"
        ));
    }

    let block = buffer[..separator.1].to_string();
    buffer.drain(..separator.1 + separator.0.len());
    Ok(Some(block))
}

fn parse_sse_data(block: &str) -> Result<Option<String>, String> {
    let data_lines = block
        .lines()
        .filter_map(|line| {
            let line = line.trim_end_matches('\r');
            let data = line.strip_prefix("data:")?;
            Some(data.strip_prefix(' ').unwrap_or(data))
        })
        .collect::<Vec<_>>();

    if data_lines.is_empty() {
        return Ok(None);
    }

    let data = data_lines.join("\n");
    if data.len() > MAX_SSE_EVENT_DATA_BYTES {
        Err(format!(
            "ntfy SSE data exceeded the {MAX_SSE_EVENT_DATA_BYTES} byte payload limit"
        ))
    } else {
        Ok(Some(data))
    }
}

fn emit_error(app: &AppHandle, calendar_id: &str, topic: &str, error: impl ToString) {
    let _ = app.emit(
        ERROR_EVENT,
        NtfyErrorEvent {
            calendar_id: calendar_id.to_string(),
            topic: topic.to_string(),
            error: error.to_string(),
        },
    );
}

#[cfg(test)]
mod tests {
    use super::{next_sse_block, parse_sse_data, MAX_SSE_BUFFER_BYTES, MAX_SSE_EVENT_DATA_BYTES};

    #[test]
    fn reads_lf_delimited_sse_blocks() {
        let mut buffer =
            "event: message\ndata: {\"event\":\"message\"}\n\nretry: 1000\n\n".to_string();

        assert_eq!(
            next_sse_block(&mut buffer).unwrap(),
            Some("event: message\ndata: {\"event\":\"message\"}".to_string())
        );
        assert_eq!(
            next_sse_block(&mut buffer).unwrap(),
            Some("retry: 1000".to_string())
        );
        assert_eq!(next_sse_block(&mut buffer).unwrap(), None);
    }

    #[test]
    fn reads_crlf_delimited_sse_blocks() {
        let mut buffer = "data: first\r\n\r\ndata: second\r\n\r\n".to_string();

        assert_eq!(
            next_sse_block(&mut buffer).unwrap(),
            Some("data: first".to_string())
        );
        assert_eq!(
            next_sse_block(&mut buffer).unwrap(),
            Some("data: second".to_string())
        );
        assert_eq!(next_sse_block(&mut buffer).unwrap(), None);
    }

    #[test]
    fn joins_multiline_sse_data() {
        assert_eq!(
            parse_sse_data("event: message\ndata: first\ndata: second").unwrap(),
            Some("first\nsecond".to_string())
        );
    }

    #[test]
    fn rejects_oversized_unterminated_sse_block() {
        let mut buffer = "x".repeat(MAX_SSE_BUFFER_BYTES + 1);

        assert!(next_sse_block(&mut buffer).is_err());
    }

    #[test]
    fn rejects_oversized_terminated_sse_block() {
        let mut buffer = format!("data: {}\n\n", "x".repeat(MAX_SSE_BUFFER_BYTES + 1));

        assert!(next_sse_block(&mut buffer).is_err());
        assert!(buffer.is_empty());
    }

    #[test]
    fn rejects_oversized_sse_data_payload() {
        let block = format!("data: {}", "x".repeat(MAX_SSE_EVENT_DATA_BYTES + 1));

        assert!(parse_sse_data(&block).is_err());
    }
}
