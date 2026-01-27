import { invoke } from "@tauri-apps/api/core";
import {
  queue_index,
  currently_playing,
  is_playing,
  set_is_playing,
  set_queue_index,
  cached_metadata,
  queue,
} from "./metadata";
import { println } from "@/other/utils";
import { createEffect, createResource, createSignal } from "solid-js";
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
let [slider_progress_paused, set_slider_progress_paused] = createSignal(false);
let [slider_value, set_slider_value] = createSignal(0);
let slider_max = 100;
let interval = setInterval(() => {
  if (slider_progress_paused() || last_prog.loading) return;
  if (last_done_check()) {
    skipForward();
    refetch_prog();
    refetch_done_check();
    return;
  }
  refetch_done_check();
  let res =
    (last_prog()! / cached_metadata[currently_playing()].duration_sec) *
    slider_max;
  set_slider_value(res);
  refetch_prog();
}, 100);

async function is_done() {
  return await invoke("player_is_done", { file: currently_playing() });
}
async function play(startSecs: number = 0) {
  await println(`Playing ${currently_playing()} at ${startSecs} seconds`);
  await invoke("play_audio", {
    file: currently_playing(),
    startSecs,
    paused: !is_playing(),
  });
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
    println(e);
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
    println(e);
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
    await invoke("player_seek", {
      file: currently_playing(),
      timeSec,
      paused: !is_playing(),
    });
  } catch (e) {
    println(e);
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

export {
  seek,
  play,
  pause,
  skipBack,
  skipForward,
  progress,
  last_prog,
  slider_max,
  slider_progress_paused,
  slider_value,
  set_slider_value,
  set_slider_progress_paused,
};
