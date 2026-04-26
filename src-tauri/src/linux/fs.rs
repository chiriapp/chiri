use tauri::command;

/// Read raw bytes from any file path. Used for drag-dropped files on Linux/WebKitGTK
/// where the frontend fs plugin is sandboxed to app directories only.
#[command]
pub fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("Failed to read file '{}': {}", path, e))
}
