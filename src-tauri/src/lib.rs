// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod server;

use nix::libc::SECBIT_EXEC_DENY_INTERACTIVE_LOCKED;
use nix::sys::signal::{kill, Signal};
use nix::unistd::Pid;
use serde;
use server::{addr_lock, get_metadata, hash, start_server};
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::env;
use std::hash::{Hash, Hasher};
use std::io::{BufRead, BufReader, Read};
use std::net::SocketAddr;
use std::os::unix::io;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Output, Stdio};
use std::sync::{LazyLock, Mutex, OnceLock};
use std::time;
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
#[derive(Debug)]
struct Player {
    file: String,
    child: Child,
    playing: bool,
    last_prog: f32,
}
static mut players: Vec<Player> = vec![];
#[tauri::command]
fn play_audio(file: String, start_secs: f32) -> Result<(), String> {
    unsafe {
        if let Some(Player { child, playing, .. }) = players.iter_mut().find(|x| *x.file == file) {
            kill(Pid::from_raw(child.id() as i32), Signal::SIGCONT).unwrap();
            *playing = true;
            //child.wait().unwrap();
            Ok(())
        } else {
            let mut child: Child = match Command::new("play")
                .args([&file, "trim", &start_secs.to_string()])
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
            {
                Ok(child) => child,
                Err(err) => {
                    println!(
                        "Failed to spawn child process from args: {:?}\n{}",
                        vec![&file, "trim", &start_secs.to_string()],
                        err
                    );
                    std::process::exit(1);
                }
            };
            players.push(Player {
                file,
                child,
                playing: true,
                last_prog: start_secs as f32,
            });
            Ok(())
        }
    }
}
#[tauri::command]
fn player_is_done(file: String) -> bool {
    unsafe {
        if let Some(Player { child, .. }) = players.iter_mut().find(|x| *x.file == file) {
            let res = child.try_wait().unwrap();
            res.is_some()
        } else {
            false
        }
    }
}
#[tauri::command]
fn pause_audio(file: String) -> Result<(), String> {
    unsafe {
        if let Some(Player { child, playing, .. }) = players.iter_mut().find(|x| *x.file == file) {
            kill(Pid::from_raw(child.id() as i32), Signal::SIGSTOP).unwrap();
            *playing = false;
            //child.wait().unwrap();
            Ok(())
        } else {
            Err("Backend Error: Player not found".into())
        }
    }
}
#[tauri::command]
fn stop_playback(file: String) -> Result<(), String> {
    unsafe {
        if let Some((i, Player { child, .. })) = players
            .iter_mut()
            .enumerate()
            .find(|(i, Player { file: f, .. })| *f == file)
        {
            child.kill().unwrap();
            players.remove(i);
            Ok(())
        } else {
            Err("Backend error: Player not found".into())
        }
    }
}
#[tauri::command]
fn player_seek(file: String, time_sec: f32) -> Result<(), String> {
    unsafe {
        if let Some((i, Player { playing, child, .. })) = players
            .iter_mut()
            .enumerate()
            .find(|(i, x)| *x.file == file)
        {
            //stop_playback(file.clone()).unwrap();
            //play_audio(file.clone(), time_sec).unwrap();
            child.kill();
            players.remove(i);
            let mut child: Child = match Command::new("play")
                .args([&file, "trim", &time_sec.to_string()])
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
            {
                Ok(child) => child,
                Err(err) => panic!("{}", err),
            };
            if !*playing {
                kill(Pid::from_raw(child.id() as i32), Signal::SIGSTOP);
            }
            players.push(Player {
                child,
                playing: *playing,
                file,
                last_prog: time_sec,
            });
            Ok(())
        } else {
            play_audio(file.clone(), time_sec);
            Ok(())
        }
    }
}
const buf_size: usize = 300;
#[tauri::command]
fn player_progress(file: String) -> Result<f32, String> {
    unsafe {
        if let Some(Player {
            child,
            playing,
            last_prog,
            ..
        }) = players.iter_mut().find(|x| *x.file == file)
        {
            if !*playing {
                return Ok(*last_prog);
            }
            let mut last = vec![0u8; buf_size];
            let mut out = vec![0u8; buf_size];

            if let Some(mut stderr) = child.stderr.as_mut() {
                loop {
                    last = out.clone();
                    let read = stderr.read(&mut out).unwrap();
                    if read < buf_size {
                        last.extend(out);
                        out = last;
                        /*if String::from_utf8_unchecked(out).lines().last().len() >= 50 {
                            break;
                        }*/
                        break;
                    }
                }
            } else {
                return Ok(0.0);
            }
            let string = String::from_utf8_unchecked(out);
            let mut lines = string.lines().rev();
            match lines.next() {
                Some(last) => {
                    let t = format!("0:0:{}", last_prog);
                    let res = last
                        .trim()
                        .split(" ")
                        .nth(1)
                        .unwrap_or(&t)
                        .split(":")
                        .enumerate();
                    let mut sum = 0f32;
                    for (i, x) in res {
                        if let Ok(parsed) = x.parse::<f32>() {
                            sum += parsed * 60f32.powf(2.0 - i as f32);
                        } else {
                            return Ok(*last_prog);
                        }; // random crashing, dont remove print
                    }

                    *last_prog = sum;
                    Ok(*last_prog)
                }
                None => Ok(0.0),
            }
        } else {
            Err(format!("Failed to find player {} from {:?}", file, players).into())
        }
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
