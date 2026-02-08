import { JSXElement, createResource, Show } from "solid-js";
import MiniPlayerSlider from "./MiniPlayerSlider";
import { last_prog, skipBack, skipForward } from "@/other/player";
import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  CaretDown,
  CaretUp,
} from "phosphor-solid";

import { format_sec, PhosphorIconProps } from "@/other/utils";

import {
  currently_playing,
  get_metadata,
  is_playing,
  set_is_playing,
} from "@/other/metadata";
import { current_page, player_full, set_player_full } from "@/other/state";
function MiniPlayer(): JSXElement {
  let weight: PhosphorIconProps["weight"] = "fill";
  let generic_hover =
    "bg-transparent hover:bg-neutral-500 transition-colors duration-150";
  let generic_icon_hover = `${generic_hover} rounded-full`;
  let icon_props: PhosphorIconProps = {
    weight,
    color: "white",
  };
  let [metadata] = createResource(currently_playing, get_metadata);
  let width_edges = "w-70";
  return (
    <Show when={!metadata.loading}>
      <div class="absolute left-0 bottom-0 w-full h-1/12 min-h-20 border-t border-t-zinc-500 bg-zinc-900 z-3 flex flex-col justify-between">
        <div class="w-full h-2 absolute -translate-y-4">
          <MiniPlayerSlider />
        </div>
        <div class="flex grow justify-between items-center">
          <div class={`h-full flex justify-around items-center ${width_edges}`}>
            <SkipBack
              {...icon_props}
              class={`w-8 h-8 ${generic_icon_hover}`}
              onclick={skipBack}
            />
            {is_playing() ? (
              <Pause
                {...icon_props}
                class={`w-12 h-12 ${generic_icon_hover}`}
                onclick={() => set_is_playing(false)}
              />
            ) : (
              <Play
                {...icon_props}
                class={`w-12 h-12 ${generic_icon_hover}`}
                onclick={() => set_is_playing(true)}
              />
            )}
            <SkipForward
              {...icon_props}
              class={`w-8 h-8 ${generic_icon_hover}`}
              onclick={skipForward}
            />
            <p class="font-light opacity-50 text-sm w-18">{`${format_sec(last_prog())} / ${format_sec(metadata()?.duration_sec)}`}</p>
          </div>
          <div class="flex grow items-center justify-center gap-4">
            <div class="w-14 aspect-square">
              <img src={metadata()?.cover_url} class="object-scale-down" />
            </div>
            <div class="flex flex-col justify-evenly">
              <p class="text-m font-normal">{metadata().tags.title}</p>
              <p class="text-sm font-light text-zinc-300">
                {["artist", "album", "year"]
                  .map((x) => metadata().tags[x])
                  .filter(Boolean)
                  .join(" \u2022 ")}
              </p>
            </div>
          </div>
          <div class={`flex justify-end items-center h-full ${width_edges}`}>
            <div class="mr-2">
              {player_full() ? (
                <CaretDown
                  {...icon_props}
                  class={`w-8 h-8 ${generic_icon_hover}`}
                  onclick={() => set_player_full(false)}
                />
              ) : (
                <CaretUp
                  {...icon_props}
                  class={`w-8 h-8 ${generic_icon_hover}`}
                  onclick={() => set_player_full(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
export default MiniPlayer;
