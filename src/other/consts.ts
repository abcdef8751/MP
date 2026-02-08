import { invoke } from "@tauri-apps/api/core";
import * as path from "@tauri-apps/api/path";

const platform = await invoke("platform");
const home_dir = await path.homeDir();
const cache_dir = await path.join(home_dir, ".cache/nev");

export { platform, cache_dir, home_dir };
