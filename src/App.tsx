import {
  createSignal,
  createEffect,
  createResource,
  splitProps,
  Show,
  Switch,
  Match,
  Signal,
  JSXElement,
  JSX,
  /* createMemo,
  Signal,
  onCleanup,
  lazy,
  untrack,
  children, */
} from "solid-js";
import {
  Metadata,
  get_media_host_url,
  FFProbeOutput,
  ffprobe,
  audio_exts,
  println,
  format_sec,
  transition,
} from "./utils.ts";
import { createStore, type Store } from "solid-js/store";
import { invoke /* convertFileSrc */ } from "@tauri-apps/api/core";

import * as path from "@tauri-apps/api/path";

import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  CaretDown,
  CaretUp,
} from "phosphor-solid";
import "./App.css";
let [cached_metadata, set_cached_metadata] = createStore<{
  [path: string]: Metadata;
}>({});
const default_cover_url = await path.join(
  await get_media_host_url(),
  "/images/default.webp",
);

let [paths, set_paths] = createStore<Record<string, string>>({});

createEffect(async () => {
  let nev = {};
  let p = paths;
  for (const [k, v] of Object.entries(cached_metadata)) {
    if (p[k]) continue;
    let url = v.cover_url;
    set_paths(k, url);
  }
});

async function get_metadata(file: string): Promise<Metadata> {
  if (cached_metadata[file]) return cached_metadata[file];
  let res: Metadata = await invoke("get_metadata", { file });
  set_paths(file, res.cover_url);
  set_cached_metadata(file, res);
  return res;
}
let [background_color, set_background_color] = createSignal("bg-black");
let [is_playing, set_is_playing] = createSignal(false);
let [queue, set_queue] = createSignal([
  "/home/rp/Music/Rips/HACHI - DONUT HOLE.flac",
  "/home/rp/Music/Rips/inabakumori - Ipace.flac",
]);

createEffect(async () => {
  let new_queue: string[] = [];
  for (const file of queue()) {
    if (!audio_exts.some((x) => file.endsWith(x))) continue;
    if (!cached_metadata[file]) {
      try {
        await get_metadata(file);
      } catch (error) {
        console.error(`Error fetching metadata for ${file}:`, error);
        continue;
      }
    }
    new_queue.push(file);
  }
  println(["new queue", new_queue]);
  if (queue().length !== new_queue.length) set_queue(new_queue);
});
let [queue_index, set_queue_index] = createSignal(0);
let currently_playing = () => queue()[queue_index()];
let lastStartSecs = 0;
let [last_prog, { refetch: refetch_prog, mutate: mutate_prog }] =
  createResource(async () => {
    try {
      return await progress();
    } catch {
      return 0;
    }
  });

let [
  last_done_check,
  { refetch: refetch_done_check, mutate: mutate_done_check },
] = createResource(is_done);
let lastSeek: number = Date.now();
let [slider_progress_paused, set_slider_progress_paused] = createSignal(false);
let [slider_value, set_slider_value] = createSignal(0);
let slider_max = 100;
let interval = setInterval(() => {
  let slider = document.getElementById("player-slider");
  if (!slider || slider_progress_paused() || last_prog.loading) return;
  if (last_done_check()) {
    skipForward();
    refetch_prog();
    refetch_done_check();
    return;
  }
  refetch_done_check();
  let res =
    (last_prog() / cached_metadata[currently_playing()].duration_sec) *
    slider_max;
  set_slider_value(res);
  refetch_prog();
}, 500);
function PlayerSlider() {
  return (
    <input
      id="player-slider"
      type="range"
      min="0"
      max={slider_max}
      step="0.1"
      class="w-full h-full appearance-none cursor-pointer bg-white/20 rounded-lg
               [&::-webkit-slider-runnable-track]:rounded-lg
               [&::-webkit-slider-thumb]:appearance-none
               [&::-webkit-slider-thumb]:h-4
               [&::-webkit-slider-thumb]:w-4
               [&::-webkit-slider-thumb]:rounded-full
               [&::-webkit-slider-thumb]:bg-white
               [&::-webkit-slider-thumb]:-mt-0
               [&::-webkit-slider-thumb]:shadow-lg"
      style={`background: linear-gradient(to right, white ${slider_value()}%, rgba(255, 255, 255, 0.1) ${slider_value()}%)`}
      value={slider_value()}
      oninput={(e) => {
        set_slider_value(Number(e.currentTarget.value));

        lastSeek = Date.now();
      }}
      onpointerdown={() => {
        set_slider_progress_paused(true);
      }}
      onpointerup={() => {
        let sought =
          (slider_value() / slider_max) *
          cached_metadata[currently_playing()].duration_sec;
        seek(sought);
      }}
    />
  );
}
async function is_done() {
  return await invoke("player_is_done", { file: currently_playing() });
}
async function play(startSecs: number = 0) {
  lastStartSecs = startSecs;
  await println(`Playing ${currently_playing()} at ${startSecs} seconds`);
  await invoke("play_audio", { file: currently_playing(), startSecs });
}
async function pause() {
  await println(`Pause ${currently_playing()}`);
  await invoke("pause_audio", { file: currently_playing() });
}
async function stop_playback() {
  await invoke("stop_playback", { file: currently_playing() });
}
async function skipBack() {
  try {
    await stop_playback();
  } catch (e) {
    console.error(e);
  }
  if (queue_index() > 0) {
    set_queue_index((x) => x - 1);
    return;
  }
  mutate_prog(0);
  if (is_playing()) play();
}
async function skipForward() {
  try {
    await stop_playback();
  } catch (e) {
    console.error(e);
  }
  if (queue_index() >= queue().length - 1) {
    set_is_playing(false);
    return;
  }
  mutate_prog(0);

  set_queue_index((x) => x + 1);
}
async function seek(timeSec: number) {
  await println(`Seeking ${currently_playing()} at ${timeSec} seconds`);
  set_slider_progress_paused(true);
  set_slider_value(
    (timeSec / cached_metadata[currently_playing()].duration_sec) * slider_max,
  );
  try {
    await invoke("player_seek", { file: currently_playing(), timeSec });
  } catch (e) {
    console.error(e);
  }
  mutate_prog(timeSec);
  if (!is_playing()) pause();
  set_slider_progress_paused(false);
}
async function progress(): Promise<number> {
  return await invoke("player_progress", { file: currently_playing() });
}
createEffect(async () => {
  queue_index();
  if (is_playing()) play();
  else pause();
});

function Button(props) {
  let [
    { children, class: props_class, onclick: props_onclick },
    component_props,
  ] = splitProps(props, ["class", "children", "onclick"]);
  return (
    <div
      role="button"
      tabindex="0"
      class={`flex justify-center items-center ${props_class}`}
      {...component_props}
      onclick={(e) => {
        e.stopPropagation();
        props_onclick?.();
      }}
    >
      {children}
    </div>
  );
}
interface PhosphorIconProps {
  size?: string | number;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  color?: string;
  mirrored?: boolean;
  [prop: string]: any;
}
type Page = "player" | "files";
let [current_page, set_current_page] = createSignal<Page>("player");
function PlayerFull(props): JSXElement {
  let [metadata] = createResource(currently_playing, get_metadata);
  return (
    <div class="w-full h-full flex justify-between">
      <Show when={!metadata.loading}>
        <div class="flex justify-center items-center h-full w-3/5 pl-10 pb-10">
          <img src={metadata()?.cover_url} class="object-scale-down" />
        </div>

        <div class="grow"></div>
      </Show>
    </div>
  );
}
function MiniPlayer(props): JSXElement {
  let weight: PhosphorIconProps["weight"] = "fill";
  let generic_hover =
    "bg-transparent hover:bg-neutral-500 transition-colors duration-150 rounded-full";
  let icon_props: PhosphorIconProps = {
    weight,
    color: "white",
  };
  let [metadata] = createResource(currently_playing, get_metadata);
  let width_edges = "w-60";
  return (
    <Show when={!metadata.loading}>
      <div class="absolute left-0 bottom-0 w-full h-1/12 border-t border-t-zinc-500 bg-zinc-900 z-1 flex flex-col justify-between">
        <div class="w-full h-2 absolute -translate-y-4">
          <PlayerSlider />
        </div>
        <div class="flex grow justify-between items-center">
          <div class={"h-full flex justify-around items-center " + width_edges}>
            <SkipBack
              {...icon_props}
              class={"w-8 h-8 " + generic_hover}
              onclick={skipBack}
            />
            {is_playing() ? (
              <Pause
                {...icon_props}
                class={"w-12 h-12 " + generic_hover}
                onclick={() => set_is_playing(false)}
              />
            ) : (
              <Play
                {...icon_props}
                class={"w-12 h-12 " + generic_hover}
                onclick={() => set_is_playing(true)}
              />
            )}
            <SkipForward
              {...icon_props}
              class={"w-8 h-8 " + generic_hover}
              onclick={skipForward}
            />
            <p class="font-light opacity-40 text-sm w-18">{`${format_sec(last_prog())} / ${format_sec(metadata()?.duration_sec)}`}</p>
          </div>
          <div class="grow flex justify-center items-center">Center</div>
          <div class={"flex justify-around items-center h-full" + width_edges}>
            {current_page() === "player" ? (
              <CaretDown {...icon_props} class={"w-8 h-8 " + generic_hover} />
            ) : (
              <CaretUp {...icon_props} class={"w-8 h-8 " + generic_hover} />
            )}
          </div>
        </div>
      </div>
    </Show>
  );
}
function SideBar(props): JSXElement {
  return <div class="w-1/5 h-full border-r border-r-zinc-500"></div>;
}

function FileExplorer(props): JSXElement {
  return <div class="w-full h-full"></div>;
}
function App() {
  let button_props = { class: "h-2/5 aspect-square" };

  return (
    <div
      class={`${background_color()} relative w-full h-screen flex justify-between text-white font-sans`}
    >
      <SideBar />
      {current_page() === "player" ? <PlayerFull /> : <FileExplorer />}
      <MiniPlayer />
    </div>
  );
}
export default App;
