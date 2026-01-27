import { createSignal } from "solid-js";

let [background_color, set_background_color] = createSignal("bg-black");

type Page = "player" | "files";
let [current_page, set_current_page] = createSignal<Page>("player");

export {
  current_page,
  set_current_page,
  background_color,
  set_background_color,
  type Page,
};
