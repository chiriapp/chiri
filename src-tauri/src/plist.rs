use std::io::Cursor;
use tauri::command;
use der::{Decode, Encode};

/// Convert a binary or signed plist to XML format
/// Takes raw bytes and returns XML string if successful
#[command]
pub fn convert_plist_to_xml(data: Vec<u8>) -> Result<String, String> {
    println!("convert_plist_to_xml called with {} bytes", data.len());

    // First, try to parse as a standard plist (binary or XML)
    let cursor = Cursor::new(&data);
    match plist::from_reader::<_, plist::Value>(cursor) {
        Ok(value) => {
            // Successfully parsed as plist, convert to XML
            let mut xml_data = Vec::new();
            plist::to_writer_xml(&mut xml_data, &value)
                .map_err(|e| {
                    eprintln!("Failed to convert to XML: {}", e);
                    format!("Failed to convert to XML: {}", e)
                })?;

            let xml_string = String::from_utf8(xml_data)
                .map_err(|e| {
                    eprintln!("Failed to convert to UTF-8: {}", e);
                    format!("Failed to convert to UTF-8: {}", e)
                })?;

            println!("Successfully converted plist to XML, {} bytes", xml_string.len());
            return Ok(xml_string);
        }
        Err(e) => {
            eprintln!("Failed to parse as standard plist: {}", e);
            println!("Attempting to decode as signed/encrypted CMS profile...");
        }
    }

    // If standard plist parsing failed, try to decode as CMS-signed profile
    // This is common for signed configuration profiles from services like Fastmail
    use cms::content_info::ContentInfo;
    use cms::signed_data::SignedData;

    // Parse the outer ContentInfo wrapper using BER (more lenient than DER)
    // Apple's signed mobileconfig files may have unordered SET OF elements
    let content_info = ContentInfo::from_ber(&data)
        .map_err(|e| format!("Failed to parse as CMS ContentInfo: {}", e))?;

    println!("ContentInfo content_type: {}", content_info.content_type);

    // Re-encode the content to DER bytes for SignedData parsing
    let content_bytes = content_info.content.to_der()
        .map_err(|e| format!("Failed to encode content to DER: {}", e))?;

    println!("Content DER bytes length: {}", content_bytes.len());

    // Parse as SignedData (also use BER for leniency)
    let signed_data = SignedData::from_ber(&content_bytes)
        .map_err(|e| format!("Failed to decode SignedData: {}", e))?;

    // Get the encapsulated content
    let encap_content = signed_data.encap_content_info.econtent.ok_or_else(|| {
        "No encapsulated content found in signed profile".to_string()
    })?;

    let decoded_bytes = encap_content.value();
    println!("Decoded CMS content, {} bytes", decoded_bytes.len());

    // Now try to parse the decoded content as plist
    let cursor = Cursor::new(decoded_bytes);
    let value: plist::Value = plist::from_reader(cursor)
        .map_err(|e| format!("Failed to parse decoded plist: {}", e))?;

    // Convert to XML
    let mut xml_data = Vec::new();
    plist::to_writer_xml(&mut xml_data, &value)
        .map_err(|e| format!("Failed to convert decoded plist to XML: {}", e))?;

    let xml_string = String::from_utf8(xml_data)
        .map_err(|e| format!("Failed to convert to UTF-8: {}", e))?;

    println!("Successfully decoded signed profile and converted to XML, {} bytes", xml_string.len());
    Ok(xml_string)
}
