use std::{fs::File, io::BufReader, sync::LazyLock, time::Duration};

use dashmap::DashMap;
use rodio::{
    decoder::DecoderBuilder, stream, Decoder, OutputStream, OutputStreamBuilder, Sink, Source,
};
use symphonia::core::io::MediaSource;

struct Player {
    sink: Sink,
    handle: OutputStream,
}
static mut players: LazyLock<DashMap<String, Player>> = LazyLock::new(|| DashMap::new());
#[tauri::command]
pub fn play_audio(file: String, start_secs: f64, paused: bool) {
    unsafe {
        if let Some(mut player) = players.get_mut(&file) {
            player.sink.play();
            return;
        }
        let file_data = File::open(&file).unwrap();
        let byte_len = file_data.byte_len().unwrap();
        let mut source = DecoderBuilder::new()
            .with_data(BufReader::new(file_data))
            .with_seekable(true)
            .with_byte_len(byte_len)
            .build()
            .unwrap();
        let stream_handle = OutputStreamBuilder::open_default_stream().unwrap();
        let sink = Sink::connect_new(stream_handle.mixer());
        if paused {
            sink.pause();
        }
        sink.append(source);
        sink.try_seek(Duration::from_secs_f64(start_secs));
        let mut res = Player {
            sink,
            handle: stream_handle,
        };
        players.insert(file.clone(), res);
    }
}

#[tauri::command]
pub fn pause_audio(file: String) {
    unsafe {
        if let Some(player) = players.get_mut(&file) {
            player.sink.pause();
        }
    }
}

#[tauri::command]
pub fn stop_playback(file: String) {
    println!("Stopping");
    unsafe {
        players.remove(&file);
    }
}

#[tauri::command]
pub fn player_is_done(file: String) -> bool {
    unsafe {
        if let Some(player) = players.get(&file) {
            player.sink.empty()
        } else {
            false
        }
    }
}

#[tauri::command]
pub fn player_progress(file: String) -> f64 {
    unsafe {
        if let Some(player) = players.get(&file) {
            player.sink.get_pos().as_secs_f64()
        } else {
            0.0
        }
    }
}

#[tauri::command]
pub fn player_seek(file: String, time_sec: f64, paused: bool) -> Result<(), String> {
    unsafe {
        if let Some(player) = players.get_mut(&file) {
            return match player.sink.try_seek(Duration::from_secs_f64(time_sec)) {
                Ok(_) => Ok(()),
                Err(e) => Err(format!("Failed to seek: {}", e)),
            };
        } else {
            play_audio(file, time_sec, paused);
        }
        Ok(())
    }
}
