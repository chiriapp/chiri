use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;

#[derive(Serialize, Deserialize)]
pub struct CaldavResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
}

/// Low-level CalDAV HTTP request executor with optional certificate validation bypass.
///
/// This command is used instead of the Tauri HTTP plugin when the account has
/// `accept_invalid_certs = true`, allowing connections to servers with self-signed
/// or privately-signed certificates. Redirect following is disabled — the TypeScript
/// layer handles redirects to keep behaviour consistent with the normal path.
#[tauri::command]
pub async fn caldav_request(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
    accept_invalid_certs: bool,
) -> Result<CaldavResponse, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(accept_invalid_certs)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| e.to_string())?;

    let mut header_map = HeaderMap::new();
    for (k, v) in &headers {
        let name = HeaderName::from_str(k).map_err(|e| e.to_string())?;
        let value = HeaderValue::from_str(v).map_err(|e| e.to_string())?;
        header_map.insert(name, value);
    }

    let method_parsed = reqwest::Method::from_bytes(method.as_bytes()).map_err(|e| e.to_string())?;

    let mut request = client.request(method_parsed, &url).headers(header_map);
    if let Some(b) = body {
        request = request.body(b);
    }

    let response = request.send().await.map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let mut resp_headers: HashMap<String, String> = HashMap::new();
    for (k, v) in response.headers() {
        if let Ok(v_str) = v.to_str() {
            resp_headers.insert(k.to_string(), v_str.to_string());
        }
    }

    let body_text = response.text().await.map_err(|e| e.to_string())?;

    Ok(CaldavResponse {
        status,
        headers: resp_headers,
        body: body_text,
    })
}
