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
        start_api_sidecar(&app_data_dir);
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

/// 获取 sidecar 启动脚本的路径（根据平台自动选择）
#[cfg(not(debug_assertions))]
fn get_sidecar_script_path() -> std::path::PathBuf {
  let exe_path = std::env::current_exe().expect("Failed to get current executable path");

  #[cfg(target_os = "macos")]
  {
    exe_path.parent()
      .and_then(|p| p.parent())
      .expect("Failed to resolve Resources directory")
      .join("Resources/binaries/mai-api-macos/start.sh")
  }

  #[cfg(target_os = "windows")]
  {
    exe_path.parent()
      .expect("Failed to resolve exe directory")
      .join("binaries/mai-api-windows/start.bat")
  }

  #[cfg(target_os = "linux")]
  {
    exe_path.parent()
      .expect("Failed to resolve exe directory")
      .join("binaries/mai-api-linux/start.sh")
  }
}

/// 启动 API sidecar 子进程
#[cfg(not(debug_assertions))]
fn start_api_sidecar(app_data_dir: &str) {
  use std::process::{Command, Stdio};

  let script = get_sidecar_script_path();
  if !script.exists() {
    log::error!("Startup script not found: {:?}", script);
    return;
  }

  let work_dir = script.parent().expect("Failed to get script parent dir");
  let mut cmd = Command::new(&script);
  cmd.current_dir(work_dir)
    .env("APP_DATA_DIR", app_data_dir)
    .env("NODE_ENV", "production")
    .stdout(Stdio::null())
    .stderr(Stdio::null());

  // Windows 上隐藏 cmd.exe 控制台窗口
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    cmd.creation_flags(CREATE_NO_WINDOW);
  }

  match cmd.spawn() {
    Ok(_) => log::info!("API sidecar started from: {:?}", script),
    Err(e) => log::error!("Failed to start API sidecar: {}", e),
  }
}
