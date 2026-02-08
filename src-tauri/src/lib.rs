// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod player;
mod server;
use player::{
    pause_audio, play_audio, player_is_done, player_progress, player_seek, stop_playback,
};

use serde;
use server::{addr_lock, get_metadata, read_dir_with_metadata, start_server};
use std::env;
use std::process::{Command, Output};
use std::{fs, thread};
#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct CommandResult {
    status: i32,
    stdout: Vec<u8>,
    stderr: Vec<u8>,
    error: String,
}
#[tauri::command]
fn command(file: String, args: Vec<String>) -> CommandResult {
    let out = Command::new(&file).args(args).output();
    match out {
        Ok(Output {
            status,
            stdout,
            stderr,
        }) => CommandResult {
            status: status.code().unwrap(),
            stdout,
            stderr,
            error: String::new(),
        },
        Err(err) => CommandResult {
            status: 1,
            stdout: vec![],
            stderr: vec![],
            error: err.to_string(),
        },
    }
}
#[tauri::command]
fn mkdir(path: String) -> Result<(), String> {
    match fs::create_dir(path) {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}
#[tauri::command]
fn platform() -> String {
    env::consts::OS.into()
}
#[tauri::command]
fn home_dir() -> String {
    env::home_dir().unwrap().to_str().unwrap().into()
}
#[tauri::command]
fn exists(path: String) -> bool {
    fs::metadata(path).is_ok()
}
#[tauri::command]
fn read_bytes(file: String) -> Result<Vec<u8>, String> {
    match fs::read(file) {
        Ok(bytes) => Ok(bytes),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
fn readdir(dir: String) -> Result<Vec<String>, String> {
    let r = fs::read_dir(dir);
    match r {
        Ok(res) => Ok(res
            .into_iter()
            .map(|x| x.unwrap().path().to_str().unwrap().to_owned())
            .collect()),
        Err(err) => Err(err.to_string()),
    }
}
#[tauri::command]
fn rprint(arg: serde_json::Value) {
    println!("{:?}", arg);
}
//static addr_lock: OnceLock<SocketAddr> = OnceLock::new();
#[tauri::command]
fn media_host_url() -> String {
    addr_lock.wait().to_string()
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    thread::spawn(|| {
        start_server(&addr_lock);
    });
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            mkdir,
            command,
            platform,
            home_dir,
            exists,
            read_bytes,
            play_audio,
            pause_audio,
            stop_playback,
            player_seek,
            player_progress,
            player_is_done,
            readdir,
            rprint,
            media_host_url,
            get_metadata,
            read_dir_with_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
