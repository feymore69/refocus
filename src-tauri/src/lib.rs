use std::sync::Mutex;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Position, Size, WebviewUrl,
    WebviewWindowBuilder,
};

struct AppState {
    quitting: Mutex<bool>,
    close_to_tray: Mutex<bool>,
    overlay_lock: Mutex<bool>,
    paused_media_sources: Mutex<Vec<String>>,
}

const OVERLAY_GUARD_PREFIX: &str = "overlay-guard-";
const OVERLAY_GUARD_BOOTSTRAP_SCRIPT: &str = r#"
(() => {
  const ROOT_ID = 'refocus-guard-root';
  const STYLE_ID = 'refocus-guard-style';

  const block = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const renderGuard = () => {
    if (!document.body || !document.head) return;

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        :root { color-scheme: dark; }
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
          font-family: "Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
          user-select: none;
          cursor: not-allowed;
          background:
            radial-gradient(1200px 720px at 20% 30%, rgba(93, 180, 255, 0.24), transparent 62%),
            radial-gradient(1100px 760px at 78% 40%, rgba(74, 255, 200, 0.22), transparent 62%),
            linear-gradient(160deg, rgba(11, 24, 52, 0.97), rgba(6, 15, 34, 0.98));
        }
        .guard-root {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 28px;
          color: rgba(239, 245, 255, 0.98);
        }
        .guard-card {
          border-radius: 24px;
          border: 1px solid rgba(176, 209, 255, 0.28);
          background: linear-gradient(160deg, rgba(19, 33, 64, 0.7), rgba(11, 19, 38, 0.72));
          box-shadow:
            0 24px 60px rgba(2, 8, 20, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(16px);
          padding: 28px 30px;
          max-width: min(500px, 80vw);
          text-align: center;
        }
        .guard-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 42px;
          width: 42px;
          border-radius: 999px;
          margin-bottom: 12px;
          font-size: 20px;
          background: radial-gradient(circle at 30% 30%, rgba(83, 212, 255, 0.78), rgba(16, 55, 114, 0.8));
          box-shadow: 0 0 22px rgba(76, 194, 255, 0.42);
        }
        .guard-title {
          margin: 0;
          font-size: 24px;
          font-weight: 640;
          letter-spacing: 0.01em;
        }
        .guard-sub {
          margin: 10px 0 0;
          font-size: 14px;
          line-height: 1.55;
          color: rgba(221, 234, 255, 0.88);
        }
      `;
      document.head.appendChild(style);
    }

    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.className = 'guard-root';
      root.setAttribute('role', 'status');
      root.setAttribute('aria-live', 'assertive');
      root.innerHTML = `
        <div class="guard-card">
          <div class="guard-badge" aria-hidden="true">◉</div>
          <p class="guard-title">Break in progress</p>
          <p class="guard-sub">Refocus is active on your main display. Return there to continue your break.</p>
        </div>
      `;
      document.body.innerHTML = '';
      document.body.appendChild(root);
    }

    document.body.setAttribute('data-refocus-guard', 'true');
  };

  ['contextmenu', 'keydown', 'mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchmove'].forEach((type) => {
    window.addEventListener(type, block, { capture: true, passive: false });
  });

  const start = () => {
    renderGuard();
    const observer = new MutationObserver(() => {
      if (!document.getElementById(ROOT_ID)) {
        renderGuard();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
"#;

fn same_monitor(a: &tauri::Monitor, b: &tauri::Monitor) -> bool {
    a.position().x == b.position().x
        && a.position().y == b.position().y
        && a.size().width == b.size().width
        && a.size().height == b.size().height
}

fn create_overlay_guard_windows(
    app: &AppHandle,
    excluded_monitor: Option<tauri::Monitor>,
) -> Result<(), String> {
    close_overlay_guard_windows(app)?;

    let monitors = app.available_monitors().map_err(|err| err.to_string())?;

    for (index, monitor) in monitors.iter().enumerate() {
        let label = format!("{}{}", OVERLAY_GUARD_PREFIX, index);
        let on_main_monitor = excluded_monitor
            .as_ref()
            .map(|current| same_monitor(current, monitor))
            .unwrap_or(false);
        if on_main_monitor || app.get_webview_window(&label).is_some() {
            continue;
        }

        // Use monitor-exact physical bounds to avoid spillover into adjacent displays.
        let physical_x = monitor.position().x;
        let physical_y = monitor.position().y;
        let physical_width = monitor.size().width;
        let physical_height = monitor.size().height;

        let guard_window = WebviewWindowBuilder::new(app, label, WebviewUrl::App("overlay-guard.html".into()))
            .initialization_script(OVERLAY_GUARD_BOOTSTRAP_SCRIPT)
            .decorations(false)
            .resizable(false)
            .maximizable(false)
            .minimizable(false)
            .closable(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .visible(false)
            .focused(false)
            .build()
            .map_err(|err| err.to_string())?;

        guard_window
            .set_position(Position::Physical(PhysicalPosition::new(physical_x, physical_y)))
            .map_err(|err| err.to_string())?;
        guard_window
            .set_size(Size::Physical(PhysicalSize::new(
                physical_width,
                physical_height,
            )))
            .map_err(|err| err.to_string())?;
        guard_window.show().map_err(|err| err.to_string())?;
    }

    Ok(())
}

fn close_overlay_guard_windows(app: &AppHandle) -> Result<(), String> {
    let labels: Vec<String> = app
        .webview_windows()
        .keys()
        .filter(|label| label.starts_with(OVERLAY_GUARD_PREFIX))
        .cloned()
        .collect();

    for label in labels {
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.close();
        }
    }

    Ok(())
}

#[tauri::command]
fn set_tray_remaining(app: AppHandle, remaining: String) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main-tray") {
        tray.set_tooltip(Some(format!("Refocus - {}", remaining)))
            .map_err(|err| err.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn quit_app(app: AppHandle, state: tauri::State<AppState>) -> Result<(), String> {
    let mut quitting = state.quitting.lock().map_err(|err| err.to_string())?;
    *quitting = true;
    app.exit(0);
    Ok(())
}

#[tauri::command]
fn set_close_to_tray(state: tauri::State<AppState>, enabled: bool) -> Result<(), String> {
    let mut close_to_tray = state.close_to_tray.lock().map_err(|err| err.to_string())?;
    *close_to_tray = enabled;
    Ok(())
}

#[tauri::command]
async fn set_overlay_lock(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    enabled: bool,
    fullscreen: bool,
) -> Result<(), String> {
    let mut overlay_lock = state.overlay_lock.lock().map_err(|err| err.to_string())?;
    *overlay_lock = enabled;
    drop(overlay_lock);

    if enabled {
        let excluded_monitor = if let Some(window) = app.get_webview_window("main") {
            if fullscreen {
                let _ = window.set_decorations(false);
                let _ = window.set_fullscreen(true);
                let _ = window.set_always_on_top(true);
            }
            window
                .current_monitor()
                .map_err(|err| err.to_string())?
                .or_else(|| app.primary_monitor().ok().flatten())
        } else {
            if fullscreen {
                app.primary_monitor().ok().flatten()
            } else {
                None
            }
        };
        create_overlay_guard_windows(&app, excluded_monitor)?;
    } else {
        close_overlay_guard_windows(&app)?;
    }

    Ok(())
}

#[tauri::command]
fn show_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|err| err.to_string())?;
        window.unminimize().map_err(|err| err.to_string())?;
        window.set_focus().map_err(|err| err.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn hide_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|err| err.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn pause_external_media(state: tauri::State<AppState>) -> Result<bool, String> {
    let paused_sources = pause_external_media_impl()?;
    let paused_any = !paused_sources.is_empty();
    let mut paused_state = state
        .paused_media_sources
        .lock()
        .map_err(|err| err.to_string())?;
    *paused_state = paused_sources;
    Ok(paused_any)
}

#[tauri::command]
fn resume_external_media(state: tauri::State<AppState>) -> Result<bool, String> {
    let paused_sources = {
        let mut paused_state = state
            .paused_media_sources
            .lock()
            .map_err(|err| err.to_string())?;
        let copy = paused_state.clone();
        paused_state.clear();
        copy
    };

    if paused_sources.is_empty() {
        return Ok(false);
    }

    resume_external_media_impl(&paused_sources)
}

#[cfg(target_os = "windows")]
fn pause_external_media_impl() -> Result<Vec<String>, String> {
    let mut paused_sources = pause_media_sessions_with_smtc().unwrap_or_default();
    if paused_sources.is_empty() {
        let fallback_toggled = pause_media_with_hardware_toggle_if_needed().unwrap_or(false);
        if fallback_toggled {
            paused_sources.push("system-media-toggle".to_string());
        }
    }
    Ok(paused_sources)
}

#[cfg(not(target_os = "windows"))]
fn pause_external_media_impl() -> Result<Vec<String>, String> {
    Ok(Vec::new())
}

#[cfg(target_os = "windows")]
fn resume_external_media_impl(paused_sources: &[String]) -> Result<bool, String> {
    if paused_sources.is_empty() {
        return Ok(false);
    }

    if paused_sources
        .iter()
        .any(|source| source == "system-media-toggle")
    {
        send_media_play_pause_toggle()?;
        return Ok(true);
    }

    Ok(resume_media_sessions_with_smtc(paused_sources).unwrap_or(false))
}

#[cfg(not(target_os = "windows"))]
fn resume_external_media_impl(_paused_sources: &[String]) -> Result<bool, String> {
    Ok(false)
}

#[cfg(target_os = "windows")]
fn send_media_play_pause_toggle() -> Result<(), String> {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        keybd_event, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP, VK_MEDIA_PLAY_PAUSE,
    };

    unsafe {
        keybd_event(
            VK_MEDIA_PLAY_PAUSE.0 as u8,
            0,
            KEYBD_EVENT_FLAGS(0),
            0,
        );
        keybd_event(VK_MEDIA_PLAY_PAUSE.0 as u8, 0, KEYEVENTF_KEYUP, 0);
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn pause_media_sessions_with_smtc() -> Result<Vec<String>, String> {
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    };

    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|err| err.to_string())?
        .get()
        .map_err(|err| err.to_string())?;

    let sessions = manager.GetSessions().map_err(|err| err.to_string())?;
    let total = sessions.Size().map_err(|err| err.to_string())?;
    let mut paused_sources: Vec<String> = Vec::new();

    for index in 0..total {
        let session = match sessions.GetAt(index) {
            Ok(value) => value,
            Err(_) => continue,
        };
        let playback_info = match session.GetPlaybackInfo() {
            Ok(value) => value,
            Err(_) => continue,
        };
        let status = match playback_info.PlaybackStatus() {
            Ok(value) => value,
            Err(_) => continue,
        };
        if status != GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
            continue;
        }
        let paused = session
            .TryPauseAsync()
            .ok()
            .and_then(|operation| operation.get().ok())
            .unwrap_or(false)
            || session
                .TryTogglePlayPauseAsync()
                .ok()
                .and_then(|operation| operation.get().ok())
                .unwrap_or(false);
        if paused {
            let source = session
                .SourceAppUserModelId()
                .map(|id| id.to_string())
                .unwrap_or_else(|_| format!("session-{index}"));
            paused_sources.push(source);
        }
    }

    paused_sources.sort();
    paused_sources.dedup();
    Ok(paused_sources)
}

#[cfg(target_os = "windows")]
fn resume_media_sessions_with_smtc(paused_sources: &[String]) -> Result<bool, String> {
    use std::collections::HashSet;
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    };

    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|err| err.to_string())?
        .get()
        .map_err(|err| err.to_string())?;

    let sessions = manager.GetSessions().map_err(|err| err.to_string())?;
    let total = sessions.Size().map_err(|err| err.to_string())?;
    let targets: HashSet<&str> = paused_sources.iter().map(String::as_str).collect();
    let mut resumed_any = false;

    for index in 0..total {
        let session = match sessions.GetAt(index) {
            Ok(value) => value,
            Err(_) => continue,
        };
        let source = session
            .SourceAppUserModelId()
            .map(|id| id.to_string())
            .unwrap_or_else(|_| format!("session-{index}"));
        if !targets.contains(source.as_str()) {
            continue;
        }
        let playback_info = match session.GetPlaybackInfo() {
            Ok(value) => value,
            Err(_) => continue,
        };
        if matches!(
            playback_info.PlaybackStatus(),
            Ok(status) if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing
        ) {
            continue;
        }
        let resumed = session
            .TryPlayAsync()
            .ok()
            .and_then(|operation| operation.get().ok())
            .unwrap_or(false)
            || session
                .TryTogglePlayPauseAsync()
                .ok()
                .and_then(|operation| operation.get().ok())
                .unwrap_or(false);
        if resumed {
            resumed_any = true;
        }
    }

    Ok(resumed_any)
}

#[cfg(target_os = "windows")]
fn pause_media_with_hardware_toggle_if_needed() -> Result<bool, String> {
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    };

    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|err| err.to_string())?
        .get()
        .map_err(|err| err.to_string())?;

    let current = manager.GetCurrentSession().map_err(|err| err.to_string())?;
    let playback_info = current.GetPlaybackInfo().map_err(|err| err.to_string())?;
    let status = playback_info.PlaybackStatus().map_err(|err| err.to_string())?;
    if status != GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
        return Ok(false);
    }

    send_media_play_pause_toggle()?;
    Ok(true)
}

fn build_tray(app: &App) -> tauri::Result<()> {
    let start_break = MenuItem::with_id(app, "start-break", "Start break now", true, None::<&str>)?;
    let pause_5m = MenuItem::with_id(app, "pause-5m", "Snooze 5 minutes", true, None::<&str>)?;
    let pause_15m = MenuItem::with_id(app, "pause-15m", "Snooze 15 minutes", true, None::<&str>)?;
    let pause_30m = MenuItem::with_id(app, "pause-30m", "Snooze 30 minutes", true, None::<&str>)?;
    let snooze_submenu = Submenu::with_id_and_items(
        app,
        "snooze-submenu",
        "Snooze",
        true,
        &[&pause_5m, &pause_15m, &pause_30m],
    )?;
    let pause_tomorrow = MenuItem::with_id(app, "pause-tomorrow", "Pause until tomorrow", true, None::<&str>)?;
    let resume = MenuItem::with_id(app, "resume", "Resume schedule", true, None::<&str>)?;
    let open_dashboard = MenuItem::with_id(app, "open-dashboard", "Open Refocus", true, None::<&str>)?;
    let open_settings = MenuItem::with_id(app, "open-settings", "Settings", true, None::<&str>)?;
    let separator_1 = PredefinedMenuItem::separator(app)?;
    let separator_2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Refocus", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &start_break,
            &snooze_submenu,
            &pause_tomorrow,
            &resume,
            &separator_1,
            &open_dashboard,
            &open_settings,
            &separator_2,
            &quit,
        ],
    )?;

    let mut tray = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app: &AppHandle, event| {
            let id = event.id().as_ref();
            if id == "quit" {
                let _ = app.emit("tray-action", "quit");
                return;
            }
            let _ = app.emit("tray-action", id.to_string());
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if let Some(window) = tray.app_handle().get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        tray = tray.icon(icon);
    }

    tray.tooltip("Refocus").build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            quitting: Mutex::new(false),
            close_to_tray: Mutex::new(true),
            overlay_lock: Mutex::new(false),
            paused_media_sources: Mutex::new(Vec::new()),
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            build_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }

            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<AppState>();
                let quitting = state.quitting.lock().map(|guard| *guard).unwrap_or(false);
                let close_to_tray = state.close_to_tray.lock().map(|guard| *guard).unwrap_or(true);
                let overlay_lock = state.overlay_lock.lock().map(|guard| *guard).unwrap_or(false);

                if overlay_lock {
                    api.prevent_close();
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                    return;
                }

                if !quitting && close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            set_tray_remaining,
            set_close_to_tray,
            quit_app,
            show_main_window,
            hide_main_window,
            set_overlay_lock,
            pause_external_media,
            resume_external_media
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
