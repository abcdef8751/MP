import { createSignal } from "solid-js";
import {
  seek,
  slider_max,
  slider_value,
  set_slider_value,
  set_slider_progress_paused,
} from "@/other/player";
import { cached_metadata, currently_playing } from "@/other/metadata";

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
               [&::-webkit-slider-thumb]:-mt
               [&::-webkit-slider-thumb]:shadow-lg"
      style={`background: linear-gradient(to right, white ${slider_value()}%, rgba(255, 255, 255, 0.1) ${slider_value()}%)`}
      value={slider_value()}
      oninput={(e) => {
        set_slider_value(Number(e.currentTarget.value));
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
export default PlayerSlider;
