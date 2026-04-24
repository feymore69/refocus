use std::sync::Mutex;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};

struct AppState {
    quitting: Mutex<bool>,
    close_to_tray: Mutex<bool>,
    overlay_lock: Mutex<bool>,
}

const OVERLAY_GUARD_PREFIX: &str = "overlay-guard-";

fn same_monitor(a: &tauri::Monitor, b: &tauri::Monitor) -> bool {
    a.position().x == b.position().x
        && a.position().y == b.position().y
        && a.size().width == b.size().width
        && a.size().height == b.size().height
}

fn create_overlay_guard_windows(app: &AppHandle) -> Result<(), String> {
    close_overlay_guard_windows(app)?;

    let main = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    let monitors = app.available_monitors().map_err(|err| err.to_string())?;
    let main_monitor = main
        .current_monitor()
        .map_err(|err| err.to_string())?
        .or_else(|| app.primary_monitor().ok().flatten());

    for (index, monitor) in monitors.iter().enumerate() {
        let label = format!("{}{}", OVERLAY_GUARD_PREFIX, index);
        let on_main_monitor = main_monitor
            .as_ref()
            .map(|current| same_monitor(current, monitor))
            .unwrap_or(false);
        if on_main_monitor || app.get_webview_window(&label).is_some() {
            continue;
        }

        WebviewWindowBuilder::new(app, label, WebviewUrl::App("overlay-guard.html".into()))
            .decorations(false)
            .resizable(false)
            .maximizable(false)
            .minimizable(false)
            .closable(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(false)
            .position(monitor.position().x as f64, monitor.position().y as f64)
            .inner_size(monitor.size().width as f64, monitor.size().height as f64)
            .build()
            .map_err(|err| err.to_string())?;
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
) -> Result<(), String> {
    let mut overlay_lock = state.overlay_lock.lock().map_err(|err| err.to_string())?;
    *overlay_lock = enabled;
    drop(overlay_lock);

    if enabled {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
        create_overlay_guard_windows(&app)?;
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
            set_overlay_lock
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
