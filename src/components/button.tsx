import { JSXElement, splitProps } from "solid-js";

function Button(props: {
  class?: string;
  children?: JSXElement;
  onclick?: (e: Event) => void;
}) {
  let [
    { children: ch, class: props_class, onclick: props_onclick },
    component_props,
  ] = splitProps(props, ["class", "children", "onclick"]);
  return (
    <div
      role="button"
      tabindex="0"
      class={`flex justify-center items-center ${props_class || ""}`}
      {...component_props}
      onclick={(e) => {
        e.stopPropagation();
        props_onclick?.(e);
      }}
    >
      {ch}
    </div>
  );
}
export { Button };
