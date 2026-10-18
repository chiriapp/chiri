use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::{Method, Proxy, Url};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;
use tauri::State;
use tokio::sync::oneshot;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);
const MAX_REQUEST_BODY_BYTES: usize = 8 * 1024 * 1024;
const MAX_RESPONSE_BODY_BYTES: usize = 64 * 1024 * 1024;

const ALLOWED_METHODS: &[Method] = &[
    Method::GET,
    Method::HEAD,
    Method::POST,
    Method::PUT,
    Method::DELETE,
    Method::OPTIONS,
];

const ALLOWED_DAV_METHODS: &[&str] = &["PROPFIND", "PROPPATCH", "REPORT", "MKCALENDAR"];

const FORBIDDEN_HEADERS: &[&str] = &[
    "connection",
    "content-length",
    "host",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
];

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProxyMode {
    System,
    None,
    Http,
    Socks,
}

#[derive(Serialize, Deserialize)]
pub struct ProxyConfig {
    pub mode: ProxyMode,
    pub host: Option<String>,
    pub port: Option<u16>,
}

#[derive(Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
}

#[derive(Default)]
pub struct HttpRequestState {
    next_request_id: AtomicU64,
    active_requests: parking_lot::Mutex<HashMap<String, HashMap<u64, oneshot::Sender<()>>>>,
}

impl HttpRequestState {
    fn register(&self, operation_id: &str) -> (u64, oneshot::Receiver<()>) {
        let request_id = self.next_request_id.fetch_add(1, Ordering::Relaxed);
        let (cancel_sender, cancel_receiver) = oneshot::channel();
        self.active_requests
            .lock()
            .entry(operation_id.to_string())
            .or_default()
            .insert(request_id, cancel_sender);
        (request_id, cancel_receiver)
    }

    fn unregister(&self, operation_id: &str, request_id: u64) {
        let mut active_requests = self.active_requests.lock();
        if let Some(requests) = active_requests.get_mut(operation_id) {
            requests.remove(&request_id);
            if requests.is_empty() {
                active_requests.remove(operation_id);
            }
        }
    }

    fn cancel(&self, operation_id: &str) {
        let requests = self.active_requests.lock().remove(operation_id);
        if let Some(requests) = requests {
            for cancel_sender in requests.into_values() {
                let _ = cancel_sender.send(());
            }
        }
    }
}

/// low-level HTTP request executor with optional certificate validation bypass
///
/// this command is used instead of the Tauri HTTP plugin when the account has
/// `accept_invalid_certs = true`, allowing connections to servers with self-signed
/// or privately-signed certificates. redirect following is disabled. the TypeScript
/// layer handles redirects to keep behaviour consistent with the normal path
#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub async fn http_request(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
    accept_invalid_certs: bool,
    proxy_config: Option<ProxyConfig>,
    timeout_ms: Option<u64>,
    operation_id: Option<String>,
    state: State<'_, HttpRequestState>,
) -> Result<HttpResponse, String> {
    let url = validate_url(&url)?;
    let method = validate_method(&method)?;
    validate_body_size(body.as_deref())?;

    let timeout = timeout_ms
        .map(Duration::from_millis)
        .unwrap_or(REQUEST_TIMEOUT)
        .clamp(Duration::from_secs(1), Duration::from_secs(60));
    let mut client_builder = reqwest::Client::builder()
        .danger_accept_invalid_certs(accept_invalid_certs)
        .redirect(reqwest::redirect::Policy::none())
        .timeout(timeout);

    client_builder = apply_proxy_config(client_builder, proxy_config)?;

    let client = client_builder.build().map_err(|e| e.to_string())?;

    let mut header_map = HeaderMap::new();
    for (k, v) in &headers {
        let name = HeaderName::from_str(k).map_err(|e| e.to_string())?;
        if FORBIDDEN_HEADERS.contains(&name.as_str()) {
            return Err(format!("Request header '{}' is not allowed", name.as_str()));
        }
        let value = HeaderValue::from_str(v).map_err(|e| e.to_string())?;
        header_map.insert(name, value);
    }

    let mut request = client.request(method, url).headers(header_map);
    if let Some(b) = body {
        request = request.body(b);
    }

    let request_registration = operation_id
        .as_deref()
        .map(|operation_id| (operation_id, state.register(operation_id)));
    let (request_id, cancel_receiver) = match request_registration {
        Some((_, (request_id, cancel_receiver))) => (Some(request_id), Some(cancel_receiver)),
        None => (None, None),
    };

    let result = execute_request(request, cancel_receiver).await;

    if let (Some(operation_id), Some(request_id)) = (operation_id.as_deref(), request_id) {
        state.unregister(operation_id, request_id);
    }

    result
}

async fn execute_request(
    request: reqwest::RequestBuilder,
    mut cancel_receiver: Option<oneshot::Receiver<()>>,
) -> Result<HttpResponse, String> {
    let mut response = if let Some(cancel_receiver) = cancel_receiver.as_mut() {
        tokio::select! {
            result = request.send() => result.map_err(sanitize_reqwest_error)?,
            _ = cancel_receiver => return Err("HTTP request cancelled".to_string()),
        }
    } else {
        request.send().await.map_err(sanitize_reqwest_error)?
    };

    let status = response.status().as_u16();
    let mut resp_headers: HashMap<String, String> = HashMap::new();
    for (k, v) in response.headers() {
        if let Ok(v_str) = v.to_str() {
            resp_headers.insert(k.to_string(), v_str.to_string());
        }
    }

    if response
        .content_length()
        .is_some_and(|length| length > MAX_RESPONSE_BODY_BYTES as u64)
    {
        return Err("Response body exceeds the 64 MiB limit".to_string());
    }

    let mut body_bytes = Vec::new();
    loop {
        let next_chunk = if let Some(cancel_receiver) = cancel_receiver.as_mut() {
            tokio::select! {
                result = response.chunk() => result.map_err(sanitize_reqwest_error)?,
                _ = cancel_receiver => return Err("HTTP request cancelled".to_string()),
            }
        } else {
            response.chunk().await.map_err(sanitize_reqwest_error)?
        };

        let Some(chunk) = next_chunk else {
            break;
        };

        if body_bytes.len().saturating_add(chunk.len()) > MAX_RESPONSE_BODY_BYTES {
            return Err("Response body exceeds the 64 MiB limit".to_string());
        }
        body_bytes.extend_from_slice(&chunk);
    }
    let body_text = String::from_utf8_lossy(&body_bytes).into_owned();

    Ok(HttpResponse {
        status,
        headers: resp_headers,
        body: body_text,
    })
}

#[tauri::command]
pub fn cancel_http_operation(operation_id: String, state: State<'_, HttpRequestState>) {
    log::debug!("Cancelling HTTP operation {operation_id}");
    state.cancel(&operation_id);
}

fn apply_proxy_config(
    client_builder: reqwest::ClientBuilder,
    proxy_config: Option<ProxyConfig>,
) -> Result<reqwest::ClientBuilder, String> {
    let Some(proxy_config) = proxy_config else {
        return Ok(client_builder);
    };

    match proxy_config.mode {
        ProxyMode::System => Ok(client_builder),
        ProxyMode::None => Ok(client_builder.no_proxy()),
        ProxyMode::Http | ProxyMode::Socks => {
            let host = proxy_config
                .host
                .map(|host| host.trim().to_string())
                .filter(|host| !host.is_empty())
                .ok_or_else(|| "Proxy host is required".to_string())?;
            let port = proxy_config
                .port
                .filter(|port| *port > 0)
                .ok_or_else(|| "Proxy port is required".to_string())?;
            let scheme = match proxy_config.mode {
                ProxyMode::Http => "http",
                ProxyMode::Socks => "socks5",
                ProxyMode::System | ProxyMode::None => unreachable!(),
            };
            let proxy_url = format!("{scheme}://{host}:{port}");
            let proxy = Proxy::all(proxy_url).map_err(|error| error.to_string())?;
            Ok(client_builder.proxy(proxy))
        }
    }
}

fn validate_url(raw_url: &str) -> Result<Url, String> {
    let mut url = Url::parse(raw_url).map_err(|_| "Invalid request URL".to_string())?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err("Only HTTP and HTTPS URLs are allowed".to_string());
    }
    if url.host().is_none() {
        return Err("Request URL must include a host".to_string());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("Credentials must not be embedded in the request URL".to_string());
    }
    url.set_fragment(None);
    Ok(url)
}

fn validate_method(raw_method: &str) -> Result<Method, String> {
    let method = Method::from_bytes(raw_method.as_bytes()).map_err(|_| "Invalid HTTP method")?;
    if ALLOWED_METHODS.contains(&method) || ALLOWED_DAV_METHODS.contains(&method.as_str()) {
        Ok(method)
    } else {
        Err(format!("HTTP method {} is not allowed", method.as_str()))
    }
}

fn validate_body_size(body: Option<&str>) -> Result<(), String> {
    if body.is_some_and(|body| body.len() > MAX_REQUEST_BODY_BYTES) {
        Err("Request body exceeds the 8 MiB limit".to_string())
    } else {
        Ok(())
    }
}

fn sanitize_reqwest_error(error: reqwest::Error) -> String {
    let host = error
        .url()
        .and_then(|url| url.host_str())
        .map(|host| host.to_string());
    let host = host.as_deref().unwrap_or("the server");
    let is_timeout = error.is_timeout();
    let is_connect = error.is_connect();
    let status = error.status();
    let inner = error.without_url().to_string();

    if is_timeout {
        return format!(
            "Request to {host} timed out. Check that the server is reachable and not behind a slow proxy."
        );
    }

    if is_connect {
        return format!("Could not connect to {host}: {inner}.");
    }

    if let Some(status) = status {
        return format!("{host} returned HTTP {status}: {inner}");
    }

    let inner_lower = inner.to_lowercase();
    if inner_lower.contains("dns error") || inner_lower.contains("failed to resolve") {
        return format!(
            "Could not resolve {host}: {inner}. Check the server URL and your network/DNS settings."
        );
    }

    if inner_lower.contains("tls") || inner_lower.contains("certificate") {
        return format!(
            "TLS/SSL error connecting to {host}: {inner}. If this is your own server with a self-signed or private certificate, choose to trust it when prompted."
        );
    }

    if inner_lower.contains("proxy") {
        return format!(
            "Proxy error while connecting to {host}: {inner}. Check your proxy settings."
        );
    }

    format!("Request to {host} failed: {inner}")
}
