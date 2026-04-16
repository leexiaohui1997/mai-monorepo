use std::env;
use std::io::{BufRead, BufReader};
use std::process::{Command as StdCommand, Stdio};
use std::sync::Mutex;
use std::thread;
use serde::Serialize;
use tauri::Emitter;

/// 全局保存 sidecar 子进程 PID，用于应用退出时清理
static SIDECAR_PID: Mutex<Option<u32>> = Mutex::new(None);

/// 环境检测结果
#[derive(Serialize)]
pub struct EnvCheckResult {
  name: String,
  installed: bool,
  version: Option<String>,
}

/// 检测系统中是否安装了 Bun
#[tauri::command]
fn check_bun() -> EnvCheckResult {
  let output = StdCommand::new("bun").arg("--version").output();
  match output {
    Ok(out) if out.status.success() => {
      let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
      EnvCheckResult { name: "bun".into(), installed: true, version: Some(version) }
    }
    _ => EnvCheckResult { name: "bun".into(), installed: false, version: None },
  }
}

/// 构建平台对应的 Bun 安装命令
fn build_bun_install_command() -> StdCommand {
  #[cfg(target_os = "windows")]
  {
    let mut cmd = StdCommand::new("powershell");
    cmd.args(["-NoProfile", "-Command", "irm bun.sh/install.ps1 | iex"]);
    cmd
  }
  #[cfg(not(target_os = "windows"))]
  {
    let mut cmd = StdCommand::new("bash");
    cmd.args(["-c", "curl -fsSL https://bun.sh/install | bash"]);
    cmd
  }
}

/// 从子进程读取输出并通过事件推送给前端
fn stream_output(reader: impl BufRead + Send + 'static, app: tauri::AppHandle) {
  thread::spawn(move || {
    for line in reader.lines().flatten() {
      let _ = app.emit("install-log", &line);
    }
  });
}

/// 安装 Bun 运行时，实时推送安装日志
#[tauri::command]
async fn install_bun(app: tauri::AppHandle) -> Result<String, String> {
  let mut cmd = build_bun_install_command();
  cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

  let mut child = cmd.spawn().map_err(|e| format!("启动安装脚本失败: {}", e))?;

  if let Some(stdout) = child.stdout.take() {
    stream_output(BufReader::new(stdout), app.clone());
  }
  if let Some(stderr) = child.stderr.take() {
    stream_output(BufReader::new(stderr), app.clone());
  }

  let status = child.wait().map_err(|e| format!("等待安装进程失败: {}", e))?;
  if status.success() {
    Ok("Bun 安装成功".into())
  } else {
    Err("安装失败，请访问 https://bun.sh 手动安装".into())
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![check_bun, install_bun])
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
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app, event| {
      if let tauri::RunEvent::Exit = event {
        kill_sidecar();
      }
    });
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
    Ok(child) => {
      let pid = child.id();
      if let Ok(mut guard) = SIDECAR_PID.lock() {
        *guard = Some(pid);
      }
      log::info!("API sidecar started (PID: {}): {:?}", pid, script);
    }
    Err(e) => log::error!("Failed to start API sidecar: {}", e),
  }
}

/// 终止 sidecar 进程树
fn kill_sidecar() {
  let pid = SIDECAR_PID.lock().ok().and_then(|guard| *guard);
  let Some(pid) = pid else { return };

  log::info!("Killing sidecar process tree (PID: {})", pid);

  #[cfg(target_os = "windows")]
  {
    // taskkill /T 会终止整个进程树（包括 bat 启动的 bun/node 子进程）
    let _ = StdCommand::new("taskkill")
      .args(["/F", "/T", "/PID", &pid.to_string()])
      .output();
  }

  #[cfg(not(target_os = "windows"))]
  {
    // 发送 SIGTERM 到进程组（负 PID）
    let _ = StdCommand::new("kill")
      .args(["-TERM", &format!("-{}", pid)])
      .output();
  }
}
