import { invoke } from "@tauri-apps/api/core";
import {
  Accessor,
  createEffect,
  createSignal,
  onCleanup,
  untrack,
} from "solid-js";
async function println(arg: any): Promise<void> {
  return await invoke("rprint", { arg });
} //window.navigator.platform.split(" ")[0].toLowerCase;

async function readBytes(file: string): Promise<Uint8Array> {
  return new Uint8Array(await invoke("read_bytes", { file }));
}
let media_host_url: string | undefined;
async function get_media_host_url(): Promise<string> {
  let res = (media_host_url || (await invoke("media_host_url")))!;
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
function hash(str: string): string {
  let res = 0n;
  for (let i = 0; i < str.length; i++) {
    res += BigInt(str.codePointAt(i)!) * 2n ** BigInt(i);
  }
  return res.toString(16);
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
  target: () => number,
  func: (x: number) => number = (x) => x,
): Accessor<number> {
  let duration_ms = duration * 1000;
  let [val, setVal] = createSignal(target());
  // let pr = new Promise<void>((res) => {
  createEffect(() => {
    let start = Date.now();
    let final = target();
    let first = untrack(val);
    println([final, first]);
    let inter = setInterval(
      () => {
        let elapsed = Date.now() - start;
        if (elapsed >= duration_ms) {
          clearInterval(inter);
          setVal(final);
          //res();
          return;
        }
        // console.log(val());
        setVal(first + (final - first) * func(elapsed / duration_ms));
      },
      Math.floor(1000 / 60),
    );
    onCleanup(() => clearInterval(inter));
  });
  //});
  return val;
}
function filename(path: string): string {
  return path.split("/").at(-1);
}
interface PhosphorIconProps {
  size?: string | number;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  color?: string;
  mirrored?: boolean;
  [prop: string]: any;
}

export {
  type PhosphorIconProps,
  format_sec,
  filename,
  hash,
  transition,
  exists,
  mkdir,
  readBytes,
  println,
  get_media_host_url,
  readdir,
};
