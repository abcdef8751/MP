use std::sync::OnceLock;
use std::{fs, net::SocketAddr};
use tiny_http::{Response, Server};
static cache_dir: &str = "/home/rp/.cache/nev";
pub fn start_server(addr_lock: &OnceLock<SocketAddr>) {
    let server = Server::http("127.0.0.1:0").unwrap();
    addr_lock
        .set(server.server_addr().to_ip().unwrap())
        .unwrap();
    for request in server.incoming_requests() {
        /*println!(
            "received request! method: {:?}, url: {:?}, headers: {:?}",
            request.method(),
            request.url(),
            request.headers()
        );*/
        let mut parts = request.url().split("/");
        let _ = parts.next();
        // println!("parts: {:?}", parts.clone().collect::<Vec<&str>>());
        let response = match (parts.next(), parts.next()) {
            (Some("images"), Some(image)) => {
                let image_path = format!("{}/images/{}", cache_dir, image);
                if fs::metadata(&image_path).is_ok() {
                    let image_data = fs::read(&image_path).unwrap();
                    Response::from_data(image_data)
                } else {
                    Response::from_string("Image not found")
                }
            }
            _ => Response::from_string("You're so silly"),
        };
        request.respond(response).unwrap();
    }
}
