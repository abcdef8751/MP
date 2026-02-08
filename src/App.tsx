import { JSXElement } from "solid-js";

import PlayerFull from "@/components/PlayerFull";

import "./App.css";
import MiniPlayer from "./components/MiniPlayer";
import {
  background_color,
  current_page,
  player_full,
  set_player_full,
} from "./other/state";
import FileExplorer from "./components/FileExplorer";
import SideBar from "./components/SideBar";

function App() {
  return (
    <div
      class={`${background_color()} relative w-full h-screen flex justify-between text-white font-sans tracking-tight antialiased overflow-hidden`}
    >
      <SideBar />
      <div class="grow relative">
        {current_page() === "files" ? <FileExplorer /> : <></>}
        <PlayerFull />
      </div>
      <MiniPlayer />
    </div>
  );
}
export default App;
