use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::{Method, Proxy, Url};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;
use std::time::Duration;

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

/// low-level HTTP request executor with optional certificate validation bypass
///
/// this command is used instead of the Tauri HTTP plugin when the account has
/// `accept_invalid_certs = true`, allowing connections to servers with self-signed
/// or privately-signed certificates. redirect following is disabled. the TypeScript
/// layer handles redirects to keep behaviour consistent with the normal path
#[tauri::command]
pub async fn http_request(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
    accept_invalid_certs: bool,
    proxy_config: Option<ProxyConfig>,
    timeout_ms: Option<u64>,
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

    let mut response = request.send().await.map_err(sanitize_reqwest_error)?;

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
    while let Some(chunk) = response.chunk().await.map_err(sanitize_reqwest_error)? {
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
    error.without_url().to_string()
}
