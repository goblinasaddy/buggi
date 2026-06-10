#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;

#[tauri::command]
fn open_main_window(window: tauri::Window) {
    // Retrieve the handle for the main terminal window
    if let Some(main_window) = window.get_window("main") {
        // Show and focus the dashboard window
        main_window.show().unwrap();
        main_window.set_focus().unwrap();
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_main_window])
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event.event() {
                let window = event.window();
                if window.label() == "main" {
                    // Prevent the window from closing (destruction) and hide it instead
                    api.prevent_close();
                    window.hide().unwrap();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
