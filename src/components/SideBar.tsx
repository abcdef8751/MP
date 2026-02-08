import { JSX, JSXElement } from "solid-js";
import { current_page } from "@/other/state";
import { Folder } from "phosphor-solid";
function Option(props: {
  label: string;
  page: string;
  icon: (props: any, ref: any) => JSX.Element;
}) {
  let common = " rounded-2xl flex-1 m-2 mb-1 mt-1";
  let generic_hover =
    "bg-transparent hover:bg-neutral-600 transition-colors duration-150" +
    common;
  let current = "bg-neutral-800" + common;
  return (
    <div
      class={`flex justify-start items-center ${current_page() === props.page ? current : generic_hover} p-2`}
    >
      {<props.icon size={36} />}
      <button class={`grow text-xl font-normal`}>{props.label}</button>
    </div>
  );
}
function SideBar(): JSXElement {
  return (
    <div class="w-1/5 h-full border-r border-r-zinc-500">
      <div class="flex flex-col justify-between h-full">
        <div class="flex flex-col w-full h-40 justify-around">
          <Option label="Files" page="files" icon={Folder} />
          <Option label="h" page="silly" icon={Folder} />
        </div>
      </div>
    </div>
  );
}
export default SideBar;
