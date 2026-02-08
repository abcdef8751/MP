import { invoke } from "@tauri-apps/api/core";
import { createEffect, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { println } from "./utils";
//import { audio_exts } from "./consts";

interface Tags {
  title: string | null;
  artist: string | null;
  album: string | null;
  genre: string | null;
  year: number | null;
  comment: string | null;
}
interface Metadata {
  tags: Tags;
  duration_sec: number;
  cover_url: string;
  file: string;
}

let [cached_metadata, set_cached_metadata] = createStore<{
  [path: string]: Metadata;
}>({});

async function get_metadata(file: string): Promise<Metadata> {
  if (cached_metadata[file]) return cached_metadata[file];
  let res: Metadata = await invoke("get_metadata", { file });
  set_cached_metadata(file, res);
  return res;
}

type PathEntry =
  | { type: "Directory"; data: string }
  | { type: "File"; data: Metadata };

async function read_dir_with_metadata(dir: string): Promise<PathEntry[]> {
  return await invoke("read_dir_with_metadata", { dir });
}
let [is_playing, set_is_playing] = createSignal(false);
let [queue, set_queue] = createSignal([
  "/home/rp/Music/Rips/HACHI - DONUT HOLE.flac",
  "/home/rp/Music/Rips/inabakumori - Ipace.flac",
]);

createEffect(async () => {
  let new_queue: string[] = [];
  for (const file of queue()) {
    if (!cached_metadata[file]) {
      try {
        await get_metadata(file);
      } catch (error) {
        println([`Error fetching metadata for ${file}:`, error]);
        continue;
      }
    }
    new_queue.push(file);
  }
  //  println(["new queue", new_queue]);
  if (queue().length !== new_queue.length) set_queue(new_queue);
});
let [queue_index, set_queue_index] = createSignal(0);
let currently_playing = () => queue()[queue_index()];

export {
  get_metadata,
  read_dir_with_metadata,
  type PathEntry,
  type Metadata,
  type Tags,
  cached_metadata,
  set_cached_metadata,
  currently_playing,
  queue,
  queue_index,
  set_queue_index,
  is_playing,
  set_is_playing,
};
