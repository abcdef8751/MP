use dashmap::DashMap;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::tag::Accessor;
use std::borrow::Cow;
use std::collections::HashMap;
use std::hash::{DefaultHasher, Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::{LazyLock, OnceLock};
use std::{fs, net::SocketAddr};
use symphonia::core::formats::{FormatOptions, FormatReader};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::{
    Metadata, MetadataOptions, MetadataReader, MetadataRevision, StandardTagKey, Tag, VendorData,
};
use symphonia::core::probe::Hint;
use symphonia::default::get_probe;
use tiny_http::{Header, Response, Server};
static cache_dir: &str = "/home/rp/.cache/nev";
pub static addr_lock: OnceLock<SocketAddr> = OnceLock::new();
static mut file_hash: LazyLock<DashMap<String, String>> = LazyLock::new(|| DashMap::new());
pub fn start_server(addr: &OnceLock<SocketAddr>) {
    let server = Server::http("127.0.0.1:0").unwrap();
    addr.set(server.server_addr().to_ip().unwrap()).unwrap();
    for request in server.incoming_requests() {
        let mut parts = request.url().split("/");
        let _ = parts.next();
        let response = match (parts.next(), parts.next()) {
            (Some("images"), Some(h)) => unsafe {
                if let Some(file) = file_hash.get(h) {
                    if fs::metadata(file.to_owned()).is_ok() {
                        let (mime_type, bytes) = get_cover(file.to_string());
                        Response::from_data(bytes).with_header(
                            Header::from_bytes(&"Content-Type"[..], &mime_type[..]).unwrap(),
                        )
                    } else {
                        Response::from_string("File not found /images").with_status_code(404)
                    }
                } else {
                    Response::from_string("File not found").with_status_code(404)
                }
            },
            _ => Response::from_string("You're so silly").with_status_code(404),
        };
        request.respond(response).unwrap();
    }
}
pub fn hash(s: &str) -> String {
    let mut hasher = DefaultHasher::new();
    s.hash(&mut hasher);
    let res = hasher.finish();
    format!("{:x}", res)
}

#[tauri::command]
pub fn get_cover(file: String) -> (String, Vec<u8>) {
    let res = lofty::read_from_path(&file).unwrap();
    let pic = res.primary_tag().unwrap().pictures();
    (
        pic[0].mime_type().unwrap().to_string(),
        pic[0].data().to_vec(),
    )
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct MetadataResult {
    tags: Tags,
    duration_sec: f64,
    cover_url: String,
}
type OptString = Option<String>;
#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct Tags {
    title: OptString,
    artist: OptString,
    album: OptString,
    genre: OptString,
    year: Option<u32>,
    comment: OptString,
}
#[tauri::command]
pub fn get_metadata(file: String) -> Result<MetadataResult, String> {
    let res = lofty::read_from_path(&file).unwrap();
    let tags = res.primary_tag().unwrap();
    let properties = res.properties();
    let cover_url = format!("http://{}/images/{}", addr_lock.wait(), hash(&file));
    unsafe {
        file_hash.insert(hash(&file), file);
    }
    let meta = MetadataResult {
        tags: Tags {
            title: tags.title().map(|s| s.to_string()),
            artist: tags.artist().map(|s| s.to_string()),
            album: tags.album().map(|s| s.to_string()),
            genre: tags.genre().map(|s| s.to_string()),
            year: tags.year(),
            comment: tags.comment().map(|s| s.to_string()),
            //  unsigned_lyrics: tags.().unwrap_or_default().to_string(),
        },
        cover_url,
        duration_sec: properties.duration().as_secs_f64(),
    };
    Ok(meta)
}
