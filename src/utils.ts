import { invoke } from "@tauri-apps/api/core";
import * as path from "@tauri-apps/api/path";
import { Accessor, createSignal, onCleanup, Signal } from "solid-js";
async function println(arg: any): Promise<void> {
  return await invoke("rprint", { arg });
}
const platform = await invoke("platform"); //window.navigator.platform.split(" ")[0].toLowerCase;
const ffprobe_path = "/bin/ffprobe";
const ffmpeg_path = "/bin/ffmpeg";
const cache_dir = await path.join(await invoke("home_dir"), ".cache/nev");
interface CommandResult {
  status: number;
  stdout: number[];
  stderr: number[];
  error: string;
}
interface FFProbeOutput {
  streams: FFProbeStream[];
  format: FFProbeFormat;
}

interface FFProbeStream {
  index: number;
  codec_name: string;
  codec_long_name: string;
  codec_type: "audio" | "video" | "subtitle" | "data";
  codec_tag_string: string;
  codec_tag: string;
  width?: number;
  height?: number;
  coded_width?: number;
  coded_height?: number;
  pix_fmt?: string;
  display_aspect_ratio?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  bits_per_sample?: number;
  r_frame_rate: string;
  avg_frame_rate: string;
  time_base: string;
  duration: string;
  bit_rate?: string;

  disposition: Record<string, number>;
  tags?: Record<string, string>;
}

interface FFProbeFormat {
  filename: string;
  nb_streams: number;
  format_name: string;
  format_long_name: string;
  duration: string;
  size: string;
  bit_rate: string;
  tags?: FFProbeTags;
}

interface FFProbeTags {
  TITLE?: string;
  ARTIST?: string;
  ALBUM?: string;
  DATE?: string;
  GENRE?: string;
  UNSYNCEDLYRICS?: string;
  [key: string]: string | undefined;
}

async function ffprobe(file: string): Promise<FFProbeOutput> {
  let { stdout, stderr, status, error }: CommandResult = await invoke(
    "command",
    {
      file: ffprobe_path,
      args: "-v quiet -of json -show_format -show_streams"
        .split(" ")
        .concat(file),
    },
  );
  if (error) throw error;
  console.log({ stdout, stderr, status, error });
  console.log(String.fromCharCode(...stdout));
  if (status !== 0) throw String.fromCharCode(...stderr);
  return JSON.parse(String.fromCharCode(...stdout));
}
async function readBytes(file: string): Promise<Uint8Array> {
  return new Uint8Array(await invoke("read_bytes", { file }));
}
let media_host_url: string | undefined;
async function get_media_host_url(): Promise<string> {
  let res = media_host_url || (await invoke("media_host_url"));
  if (!res.startsWith("http://")) res = "http://" + res;
  media_host_url = res;
  return res;
}

async function mkdir(path: string): Promise<void> {
  await invoke("mkdir", { path });
}
async function exists(path: string): Promise<boolean> {
  return invoke("exists", { path });
}
/*async function get_cover(file: string): Promise<string | undefined> {
  let out_dir = await path.join(cache_dir, "images");
  let basename = hash(file) + "_cover.jpg";
  let out_file = await path.join(out_dir, basename);
  try {
    await mkdir(out_dir);
  } catch {}
  // if (await exists(out_file)) return out_file;

  if (!(await exists(out_file))) {
    try {
      await invoke("command", {
        file: ffmpeg_path,
        args: ["-i", file, "-an", "-map", "0:1", "-c", "copy", out_file],
      });
    } catch {
      return undefined;
    }
  }
  return (await get_media_host_url()) + "/images/" + basename;
}*/

function hash(str: string): string {
  let res = 0n;
  for (let i = 0; i < str.length; i++) {
    res += BigInt(str.codePointAt(i)!) * 2n ** BigInt(i);
  }
  return res.toString(16);
}
/*async function msConvertFromSrc(
  src: string,
  options?: BlobPropertyBag,
): Promise<string> {
  let file = await readBytes(src);
  let blob = new Blob([file], options);
  let url = URL.createObjectURL(blob);
  onCleanup(() => URL.revokeObjectURL(url));
  return url;
}*/
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
}
async function readdir(dir: string): Promise<string[]> {
  let res = (await invoke("readdir", { dir })) as string[];
  return res;
}

function format_sec(sec: number): string {
  let minutes = Math.floor(sec / 60);
  let seconds = Math.floor(sec % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function transition(
  duration: number,
  range: [number, number],
  func: (x: number) => number = (x) => x,
): Accessor<number> {
  let duration_ms = duration * 1000;
  let [val, setVal] = createSignal(range[0]);
  let start = Date.now();
  let inter = setInterval(
    () => {
      let elapsed = Date.now() - start;
      if (elapsed >= duration_ms) {
        clearInterval(inter);
        setVal(range[1]);
        return;
      }
      // console.log(val());
      setVal(range[0] + (range[1] - range[0]) * func(elapsed / duration_ms));
    },
    Math.floor(1000 / 60),
  );
  onCleanup(() => clearInterval(inter));
  return val;
}
const audio_exts = [".flac", ".mp3"];

export {
  type Metadata,
  type FFProbeOutput,
  type FFProbeStream,
  type FFProbeFormat,
  type CommandResult,
  format_sec,
  hash,
  // get_cover,
  transition,
  exists,
  mkdir,
  readBytes,
  ffprobe,
  println,
  get_media_host_url,
  readdir,
  ffprobe_path,
  ffmpeg_path,
  audio_exts,
};
