use tauri::Manager;

#[tauri::command]
fn backup_database(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = data_dir.join("notes.db");
    let backup_path = data_dir.join("notes.db.backup");
    if db_path.exists() {
        std::fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;
    }
    Ok("ok".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![backup_database]);

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp::init_with_config(
            tauri_plugin_mcp::PluginConfig::new("Notes".to_string())
                .tcp_localhost(4000)
        ));
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
