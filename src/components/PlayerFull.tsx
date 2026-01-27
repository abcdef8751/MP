import { createResource, Show, JSXElement } from "solid-js";
import { get_metadata, currently_playing } from "@/other/metadata";

function PlayerFull(): JSXElement {
  let [metadata] = createResource(currently_playing, get_metadata);
  return (
    <div class="w-full h-full flex justify-between">
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
