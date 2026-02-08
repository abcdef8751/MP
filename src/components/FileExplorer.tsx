import { home_dir } from "@/other/consts";
import { Folder } from "phosphor-solid";
import {
  cached_metadata,
  Metadata,
  PathEntry,
  queue,
  read_dir_with_metadata,
} from "@/other/metadata";
import { filename, println, readdir } from "@/other/utils";
import { createResource, createSignal, For, JSXElement, Show } from "solid-js";
function SongHandle(props: { metadata: Metadata }) {
  return (
    <Show when={props.metadata}>
      <div class="w-full p-2 flex">
        <img
          src={props.metadata.cover_url}
          alt={props.metadata.tags.title}
          class="w-16 h-16"
        />
        <div class="grow pl-2 flex flex-col justify-around">
          <span class="font-normal">{props.metadata.tags.title}</span>
          <span class="text-sm font-light text-zinc-300">
            {props.metadata.tags.artist}
          </span>
          <span class="text-sm font-light text-zinc-300">
            {props.metadata.tags.album}
          </span>
        </div>
      </div>
    </Show>
  );
}

function FolderHandle(props: { dir: string }) {
  return (
    <div class="w-full p-2 flex">
      <Folder size={35} />
      <div class="grow pl-2 flex flex-col justify-around">
        <span class="font-normal text-lg">{filename(props.dir)}</span>
      </div>
    </div>
  );
}
let [fx_path, set_fx_path] = createSignal(home_dir);

function FileExplorer(): JSXElement {
  println([queue()]);
  let [dir] = createResource(() => read_dir_with_metadata(fx_path()));
  return (
    <Show when={dir()}>
      <div class="h-full w-full overflow-y-auto pb-20">
        <For each={dir()}>
          {(entry: PathEntry) => {
            if (entry.type === "File") {
              if (filename(entry.data.file).startsWith(".")) return;
              return <SongHandle metadata={entry.data} />;
            } else {
              // if (filename(entry.data).startsWith(".")) return;
              return <FolderHandle dir={entry.data} />;
            }
          }}
        </For>
      </div>
    </Show>
  );
}
export default FileExplorer;
