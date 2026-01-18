import {
  createSignal,
  createEffect,
  createResource,
  splitProps,
  Show,
  Switch,
  Match,
  Signal,
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
  get_cover,
  audio_exts,
  println,
  format_sec,
} from "./utils.ts";
import { createStore, type Store } from "solid-js/store";
import { invoke /* convertFileSrc */ } from "@tauri-apps/api/core";

import * as path from "@tauri-apps/api/path";

import { SkipBack, SkipForward, Play, Pause, CaretDown } from "phosphor-solid";
import "./App.css";
//import { Router, Route } from "@solidjs/router";

let [cached_metadata, set_cached_metadata] = createStore<{
  [path: string]: Metadata;
}>({});
const default_cover_url = await path.join(
  await get_media_host_url(),
  "/images/default.webp",
); //do something here
// URL.createURL or some shit
let [paths, set_paths] = createStore({});

createEffect(async () => {
  //console.log("cached: ", cached_metadata);
  let nev = {};
  let p = paths;
  for (const [k, v] of Object.entries(cached_metadata)) {
    if (p[k]) continue;
    let url = v.cover_url;
    set_paths(k, url);
  }
});

let paths_arr = () =>
  Object.entries(paths).sort((a, b) => (a[0] > b[0] ? 1 : -1));

async function get_metadata(file: string): Promise<Metadata> {
  if (cached_metadata[file]) return cached_metadata[file];
  let probe: FFProbeOutput;
  try {
    probe = await ffprobe(file);
  } catch (e) {
    console.error(`Error ffprobe for ${file}:`, e);
  }
  let streams = probe.streams;
  let tags = probe.format.tags || streams[0].tags;
  let duration_sec = parseFloat(probe.streams[0].duration);
  let duration_min = Math.floor(duration_sec / 60);
  let cover_url: string | undefined;
  try {
    cover_url = await get_cover(file);
  } catch (error) {
    console.log("get_cover error: ", error);
  }
  let res: Metadata = {
    tags,
    streams,
    duration_sec,
    cover_url: cover_url || default_cover_url,
    has_cover: cover_url !== undefined,
    duration: [duration_min, duration_sec - duration_min * 60],
  };
  set_cached_metadata(file, res);
  return res;
}
let [background_color, set_background_color] = createSignal("bg-black");
let [is_playing, set_is_playing] = createSignal(false);
let [queue, set_queue] = createSignal([
  "/home/rp/Music/Rips/HACHI - DONUT HOLE.flac",
  "/home/rp/Music/Rips/inabakumori - Ipace.flac",
]);
//set_queue();

//set_queue(await readdir("/home/rp/Music/Rips"));

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
  console.log("new queue", new_queue);
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
  if (last_done_check()) {
    skipForward();
    refetch_prog();
    refetch_done_check();
    return;
  }
  refetch_done_check();
  let slider = document.getElementById("player-slider");
  //console.log(last_prog, last_prog.state, last_prog.loading);
  if (!slider || slider_progress_paused() || last_prog.loading) return;
  let res =
    (last_prog() / cached_metadata[currently_playing()].duration_sec) *
    slider_max;
  set_slider_value(res);
  refetch_prog();
}, 200);
function PlayerSlider() {
  return (
    <input
      id="player-slider"
      type="range"
      min="0"
      max={slider_max}
      step="0.1"
      class="w-9/10 h-2 appearance-none cursor-pointer bg-white/20 rounded-lg
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
        set_slider_value(Math.floor(Number(e.currentTarget.value)));
        //  let slider = document.getElementById("player-slider");
        set_slider_progress_paused(true);
        //  let to_change = false;
        let sought =
          (slider_value() / slider_max) *
          cached_metadata[currently_playing()].duration_sec;
        if (Math.abs(Date.now() - lastSeek) > 10) {
          seek(sought);
          //   to_change = true;
        }
        lastSeek = Date.now();
        mutate_prog(sought); // refetch_prog();
        set_slider_progress_paused(false);
      }}
    />
  );
}
async function is_done() {
  return await invoke("player_is_done", { file: currently_playing() });
}
async function play(startSecs: number = 0) {
  // startSecs = Math.ceil(startSecs);
  lastStartSecs = startSecs;
  await println(`Playing ${currently_playing()} at ${startSecs} seconds`);
  await invoke("play_audio", { file: currently_playing(), startSecs });
}
async function pause() {
  console.log(currently_playing());

  await println(`Pause ${currently_playing()}`);
  await invoke("pause_audio", { file: currently_playing() });
}
async function stop_playback() {
  await invoke("stop_playback", { file: currently_playing() });
}
async function skipBack() {
  //set_slider_progress_paused(true);
  await stop_playback();
  if (queue_index() > 0) {
    set_queue_index((x) => x - 1);
    return;
  }
  mutate_prog(0);
  //seek(0);
  //set_slider_progress_paused(false);
}
async function skipForward() {
  // set_slider_progress_paused(true);
  await stop_playback();
  if (queue_index() >= queue().length - 1) {
    set_is_playing(false);
    return;
  }
  mutate_prog(0);
  // set_slider_value(0);
  set_queue_index((x) => x + 1);
  // set_slider_progress_paused(false);
}
async function seek(timeSec: number) {
  //timeSec = Math.ceil(timeSec);
  await println(`Seeking ${currently_playing()} at ${timeSec} seconds`);
  set_slider_progress_paused(true);
  set_slider_value(
    (timeSec / cached_metadata[currently_playing()].duration_sec) * slider_max,
  );
  try {
    await invoke("player_seek", { file: currently_playing(), timeSec });
  } catch (e) {
    console.error(e);
    //  await play(timeSec);
  }
  await refetch_prog();
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

let [minimised_at, set_minimised]: Signal<"top" | "bottom" | "none"> =
  createSignal("bottom");
function set_minimised_at(value: "top" | "bottom" | "none") {
  document.startViewTransition(() => {
    set_minimised(value);
  });
}
function Player(props: Record<string, string>) {
  let weight = "thin";
  let icon_props = { class: "h-9/10 w-9/10", weight };
  let button_props = { class: "h-2/5 aspect-square" };
  let [metadata] = createResource(currently_playing, get_metadata);
  return (
    <div class={`${background_color()} text-white h-screen`}>
      <Show when={!metadata.loading && paths[currently_playing()]}>
        <Switch>
          <Match when={minimised_at() === "none"}>
            <div class="h-1/20 flex items-center justify-between">
              <CaretDown
                weight={weight}
                class="w-1/8 h-9/10"
                onclick={() => set_minimised_at("bottom")}
              />
            </div>
            <div class="flex items-center justify-center h-2/5">
              <div
                class="h-full w-full"
                style={{ "view-transition-name": "cover" }}
              >
                <img
                  src={paths[currently_playing()]}
                  alt="Cover"
                  class="w-full h-full object-scale-down"
                />
              </div>
            </div>
            <div class="flex h-1/10 flex-col justify-around items-center">
              <p
                class="font-semibold"
                style={{ "view-transition-name": "title" }}
              >
                {metadata().tags.TITLE}
              </p>
              <p
                class="font-light"
                style={{ "view-transition-name": "artist" }}
              >
                {metadata().tags.ARTIST}
              </p>
              <p class="font-light">{metadata().tags.ALBUM}</p>
            </div>
            <div class="flex h-2/10 justify-around items-center">
              <p>
                {format_sec(
                  Math.ceil(
                    (slider_value() / slider_max) * metadata().duration_sec,
                  ),
                )}
              </p>
              <PlayerSlider />
              <p>{format_sec(metadata().duration_sec)}</p>
            </div>
            <div class="flex h-1/4 justify-around items-center">
              <Button {...button_props} onclick={skipBack}>
                <SkipBack {...icon_props} />
              </Button>
              {is_playing() ? (
                <Button {...button_props} onclick={() => set_is_playing(false)}>
                  <Pause {...icon_props} />
                </Button>
              ) : (
                <Button {...button_props} onclick={() => set_is_playing(true)}>
                  <Play {...icon_props} onclick={() => set_is_playing(true)} />
                </Button>
              )}
              <Button {...button_props} onclick={skipForward}>
                <SkipForward {...icon_props} />
              </Button>
            </div>
          </Match>
          <Match when={minimised_at() !== "none"}>
            <div
              onclick={() => set_minimised_at("none")}
              class={`flex flex-col size-full ${minimised_at() === "bottom" ? "justify-end" : "justify-start"}`}
            >
              <div class="h-1/6 w-full flex justify-between items-center">
                <div class="w-1/2 h-full flex justify-evenly items-center">
                  <div class="w-2/5 h-4/5">
                    <div
                      class="h-full w-full"
                      style={{ "view-transition-name": "cover" }}
                    >
                      <img
                        src={paths[currently_playing()]}
                        alt="Cover"
                        class="w-full h-full object-scale-down"
                      />
                    </div>
                  </div>
                  <div class="w-2/5 h-3/5 flex flex-col justify-evenly">
                    <p
                      class="font-semibold"
                      style={{ "view-transition-name": "title" }}
                    >
                      {metadata().tags.TITLE}
                    </p>
                    <p
                      class="font-light"
                      style={{ "view-transition-name": "artist" }}
                    >
                      {metadata().tags.ARTIST}
                    </p>
                  </div>
                </div>

                <div class="flex w-1/2 h-full justify-around items-center">
                  <Button {...button_props} onclick={skipBack}>
                    <SkipBack {...icon_props} />
                  </Button>
                  {is_playing() ? (
                    <Button
                      {...button_props}
                      onclick={() => set_is_playing(false)}
                    >
                      <Pause {...icon_props} />
                    </Button>
                  ) : (
                    <Button
                      {...button_props}
                      onclick={() => set_is_playing(true)}
                    >
                      <Play
                        {...icon_props}
                        onclick={() => set_is_playing(true)}
                      />
                    </Button>
                  )}
                  <Button {...button_props} onclick={skipForward}>
                    <SkipForward {...icon_props} />
                  </Button>
                </div>
              </div>
            </div>
          </Match>
        </Switch>
      </Show>
    </div>
  );
}
function App() {
  async function main() {}
  main();
  return (
    <div>
      <Player />
    </div>
  );
}
export default App;
