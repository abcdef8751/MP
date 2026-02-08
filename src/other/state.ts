import { createSignal } from "solid-js";

let [background_color, set_background_color] = createSignal("bg-black");
let [player_full, set_player_full] = createSignal(false);

type Page = "files";
let [current_page, set_current_page] = createSignal<Page>("files");

export {
  current_page,
  set_current_page,
  background_color,
  set_background_color,
  player_full,
  set_player_full,
  type Page,
};
