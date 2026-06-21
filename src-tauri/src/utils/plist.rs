use der::{Decode, Encode};
use std::io::Cursor;
use tauri::command;

/// convert a binary or signed plist to XML format
/// takes raw bytes and returns XML string if successful
#[command]
pub fn convert_plist_to_xml(data: Vec<u8>) -> Result<String, String> {
    log::debug!(
        "[Plist] convert_plist_to_xml called with {} bytes",
        data.len()
    );

    // first, try to parse as a standard plist (binary or XML)
    let cursor = Cursor::new(&data);
    match plist::from_reader::<_, plist::Value>(cursor) {
        Ok(value) => {
            // successfully parsed as plist, convert to XML
            let mut xml_data = Vec::new();
            plist::to_writer_xml(&mut xml_data, &value).map_err(|e| {
                log::warn!("[Plist] Failed to convert plist to XML: {e}");
                format!("Failed to convert to XML: {}", e)
            })?;

            let xml_string = String::from_utf8(xml_data).map_err(|e| {
                log::warn!("[Plist] Failed to convert XML output to UTF-8: {e}");
                format!("Failed to convert to UTF-8: {}", e)
            })?;

            log::debug!(
                "[Plist] Successfully converted plist to XML, {} bytes",
                xml_string.len()
            );
            return Ok(xml_string);
        }
        Err(e) => {
            log::debug!("[Plist] Failed to parse as standard plist: {e}");
            log::debug!("[Plist] Attempting to decode as signed/encrypted CMS profile");
        }
    }

    // if standard plist parsing failed, try to decode as CMS-signed profile
    // this is common for signed configuration profiles from services like Fastmail
    use cms::content_info::ContentInfo;
    use cms::signed_data::SignedData;

    // parse the outer ContentInfo wrapper using BER (more lenient than DER)
    // Apple's signed mobileconfig files may have unordered SET OF elements
    let content_info = ContentInfo::from_ber(&data)
        .map_err(|e| format!("Failed to parse as CMS ContentInfo: {}", e))?;

    log::debug!(
        "[Plist] ContentInfo content_type: {}",
        content_info.content_type
    );

    // re-encode the content to DER bytes for SignedData parsing
    let content_bytes = content_info
        .content
        .to_der()
        .map_err(|e| format!("Failed to encode content to DER: {}", e))?;

    log::debug!("[Plist] Content DER bytes length: {}", content_bytes.len());

    // parse as SignedData (also use BER for leniency)
    let signed_data = SignedData::from_ber(&content_bytes)
        .map_err(|e| format!("Failed to decode SignedData: {}", e))?;

    // get the encapsulated content
    let encap_content = signed_data
        .encap_content_info
        .econtent
        .ok_or_else(|| "No encapsulated content found in signed profile".to_string())?;

    let decoded_bytes = encap_content.value();
    log::debug!("[Plist] Decoded CMS content, {} bytes", decoded_bytes.len());

    // now try to parse the decoded content as plist
    let cursor = Cursor::new(decoded_bytes);
    let value: plist::Value =
        plist::from_reader(cursor).map_err(|e| format!("Failed to parse decoded plist: {}", e))?;

    // convert to XML
    let mut xml_data = Vec::new();
    plist::to_writer_xml(&mut xml_data, &value)
        .map_err(|e| format!("Failed to convert decoded plist to XML: {}", e))?;

    let xml_string =
        String::from_utf8(xml_data).map_err(|e| format!("Failed to convert to UTF-8: {}", e))?;

    log::debug!(
        "[Plist] Successfully decoded signed profile and converted to XML, {} bytes",
        xml_string.len()
    );
    Ok(xml_string)
}
