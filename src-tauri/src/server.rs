use dashmap::DashMap;
use lazy_static::lazy_static;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::tag::Accessor;
use serde::{Deserialize, Serialize};
use std::ffi::OsStr;
use std::hash::{DefaultHasher, Hash, Hasher};
use std::sync::{LazyLock, OnceLock};
use std::{fs, net::SocketAddr};
use tiny_http::{Header, Response, Server};

lazy_static! {
    static ref audio_exts: Vec<&'static str> = vec![".mp3", ".wav", ".flac", ".ogg", ".m4a"];
}

static cache_dir: &str = "/home/rp/.cache/nev";
pub static addr_lock: OnceLock<SocketAddr> = OnceLock::new();
static file_hash: LazyLock<DashMap<String, String>> = LazyLock::new(|| DashMap::new());
pub fn start_server(addr: &OnceLock<SocketAddr>) {
    let server = Server::http("127.0.0.1:0").unwrap();
    addr.set(server.server_addr().to_ip().unwrap()).unwrap();
    for request in server.incoming_requests() {
        let mut parts = request.url().split("/");
        let _ = parts.next();
        let response = match (parts.next(), parts.next()) {
            (Some("images"), Some(h)) => {
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
            }
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

#[derive(Debug, Serialize, Deserialize)]
pub struct MetadataResult {
    tags: Tags,
    duration_sec: f64,
    cover_url: String,
    file: String,
}
type OptString = Option<String>;
#[derive(Debug, Serialize, Deserialize)]
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

    file_hash.insert(hash(&file), file.clone());

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
        file,
    };
    Ok(meta)
}
#[derive(Serialize)]
#[serde(tag = "type", content = "data")]
pub enum PathEntry {
    Directory(String),
    File(MetadataResult),
}
#[tauri::command]
pub fn read_dir_with_metadata(dir: String) -> Result<Vec<PathEntry>, String> {
    let mut metadata = Vec::new();
    let mut dirs = Vec::new();
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(e) => return Err(e.to_string()),
    };
    for entry in entries {
        let path = entry.unwrap().path();
        let extension = path.extension().unwrap_or(OsStr::new("")).to_str().unwrap();
        if path.is_file() && audio_exts.contains(&extension) {
            match get_metadata(path.to_str().unwrap().to_string()) {
                Ok(meta) => metadata.push(PathEntry::File(meta)),
                Err(e) => println!("Error reading metadata: {}", e),
            }
        } else if path.is_dir() {
            dirs.push(PathEntry::Directory(path.to_str().unwrap().to_string()));
        }
    }
    let res = dirs.into_iter().chain(metadata.into_iter()).collect();
    Ok(res)
}
