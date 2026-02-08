import {
  createResource,
  Show,
  JSXElement,
  createMemo,
  createSignal,
  Accessor,
} from "solid-js";
import { get_metadata, currently_playing } from "@/other/metadata";
import { transition } from "@/other/utils";
import { player_full } from "@/other/state";
function PlayerFull(): JSXElement {
  let [metadata] = createResource(currently_playing, get_metadata);
  let target = () => (player_full() ? 0 : 100);
  let t = transition(0.2, target, (x) => 1 - (x - 1) ** 4);
  return (
    <div
      class="w-full h-full justify-between absolute z-2 bg-black"
      style={{ top: t() + "%", display: t() === 100 ? "none" : "flex" }}
    >
      <Show when={!metadata.loading}>
        <div class="flex justify-center items-center h-full w-3/5 p-10 -translate-y-10">
          <img
            src={metadata()?.cover_url}
            class="object-scale-down w-9/10 h-9/10"
          />
        </div>

        <div class="grow flex items-center justify-center">Later</div>
      </Show>
    </div>
  );
}

export default PlayerFull;
