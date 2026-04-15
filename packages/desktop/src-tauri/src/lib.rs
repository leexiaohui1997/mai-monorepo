use std::env;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|_app| {
      let app_data_dir = get_app_data_dir();
      env::set_var("APP_DATA_DIR", &app_data_dir);
      
      log::info!("App data directory: {}", app_data_dir);
      
      // 在生产环境启动 API sidecar
      #[cfg(not(debug_assertions))]
      {
        use std::process::{Command, Stdio};
        
        let exe_path = std::env::current_exe().expect("Failed to get current executable path");
        let resource_base = exe_path.parent()
          .and_then(|p| p.parent())
          .expect("Failed to resolve Resources directory")
          .join("Resources");
        let startup_script = resource_base.join("binaries/mai-api-macos/start.sh");
        
        if startup_script.exists() {
          Command::new(&startup_script)
            .current_dir(startup_script.parent().expect("Failed to get script parent dir"))
            .env("APP_DATA_DIR", &app_data_dir)
            .env("NODE_ENV", "production")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("Failed to start API sidecar");
          
          log::info!("API sidecar started from: {:?}", startup_script);
        } else {
          log::error!("Startup script not found: {:?}", startup_script);
        }
      }
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

/// 获取应用数据目录
/// macOS: ~/Library/Application Support/com.mai.desktop
/// Windows: C:\Users\<username>\AppData\Roaming\com.mai.desktop
/// Linux: ~/.config/com.mai.desktop
fn get_app_data_dir() -> String {
  let bundle_id = "com.mai.desktop";
  
  #[cfg(target_os = "macos")]
  {
    let home = dirs::home_dir().expect("Failed to get home directory");
    home
      .join("Library")
      .join("Application Support")
      .join(bundle_id)
      .to_string_lossy()
      .into_owned()
  }
  
  #[cfg(target_os = "windows")]
  {
    let app_data = dirs::data_dir().expect("Failed to get AppData directory");
    app_data
      .join(bundle_id)
      .to_string_lossy()
      .into_owned()
  }
  
  #[cfg(target_os = "linux")]
  {
    let config = dirs::config_dir().expect("Failed to get config directory");
    config
      .join(bundle_id)
      .to_string_lossy()
      .into_owned()
  }
  
  #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
  {
    // 其他平台使用默认逻辑
    let home = dirs::home_dir().expect("Failed to get home directory");
    home
      .join(".mai")
      .to_string_lossy()
      .into_owned()
  }
}
