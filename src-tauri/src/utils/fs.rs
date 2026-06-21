use std::path::Path;

use tauri::command;

pub fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        std::fs::create_dir_all(dst)?;
    }

    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if ty.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }

    Ok(())
}

pub fn is_dir_empty(path: &Path) -> std::io::Result<bool> {
    Ok(std::fs::read_dir(path)?.next().is_none())
}

/// read raw bytes from any file path. used for drag-dropped files on Linux/WebKitGTK
/// where the frontend fs plugin is sandboxed to app directories only
#[command]
pub fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("Failed to read file '{}': {}", path, e))
}
