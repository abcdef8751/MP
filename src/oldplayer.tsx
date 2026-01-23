/*<div class={`${background_color()} text-white h-screen`}>
  <Show when={!metadata.loading && paths[currently_playing()]}>
    <Switch>
      <Match when={minimised_at() === "none"}>
        <div class="h-1/20 flex items-center justify-between">
          <CaretDown
            weight={weight}
            class="w-1/8 h-9/10"
            onclick={() => set_minimised_at("bottom")}
          />
        </div>
        <div class="flex items-center justify-center h-2/5">
          <div
            class="h-full w-full"
            style={{ "view-transition-name": "cover" }}
          >
            <img
              src={paths[currently_playing()]}
              alt="Cover"
              class="w-full h-full object-scale-down"
            />
          </div>
        </div>
        <div class="flex h-1/10 flex-col justify-around items-center">
          <p class="font-semibold" style={{ "view-transition-name": "title" }}>
            {metadata().tags.title}
          </p>
          <p class="font-light" style={{ "view-transition-name": "artist" }}>
            {metadata().tags.artist}
          </p>
          <p class="font-light">{metadata().tags.album}</p>
        </div>
        <div class="flex h-2/10 justify-around items-center">
          <p>
            {format_sec(
              Math.ceil(
                (slider_value() / slider_max) * metadata().duration_sec,
              ),
            )}
          </p>
          <PlayerSlider />
          <p>{format_sec(metadata().duration_sec)}</p>
        </div>
        <div class="flex h-1/4 justify-around items-center">
          <Button {...button_props} onclick={skipBack}>
            <SkipBack {...icon_props} />
          </Button>
          {is_playing() ? (
            <Button {...button_props} onclick={() => set_is_playing(false)}>
              <Pause {...icon_props} />
            </Button>
          ) : (
            <Button {...button_props} onclick={() => set_is_playing(true)}>
              <Play {...icon_props} onclick={() => set_is_playing(true)} />
            </Button>
          )}
          <Button {...button_props} onclick={skipForward}>
            <SkipForward {...icon_props} />
          </Button>
        </div>
      </Match>
      <Match when={minimised_at() !== "none"}>
        <div
          onclick={() => set_minimised_at("none")}
          class={`flex flex-col size-full ${minimised_at() === "bottom" ? "justify-end" : "justify-start"}`}
        >
          <div class="h-1/6 w-full flex justify-between items-center">
            <div class="w-1/2 h-full flex justify-evenly items-center">
              <div class="w-2/5 h-4/5">
                <div
                  class="h-full w-full"
                  style={{ "view-transition-name": "cover" }}
                >
                  <img
                    src={paths[currently_playing()]}
                    alt="Cover"
                    class="w-full h-full object-scale-down"
                  />
                </div>
              </div>
              <div class="w-2/5 h-3/5 flex flex-col justify-evenly">
                <p
                  class="font-semibold"
                  style={{ "view-transition-name": "title" }}
                >
                  {metadata().tags.title}
                </p>
                <p
                  class="font-light"
                  style={{ "view-transition-name": "artist" }}
                >
                  {metadata().tags.artist}
                </p>
              </div>
            </div>

            <div class="flex w-1/2 h-full justify-around items-center">
              <Button {...button_props} onclick={skipBack}>
                <SkipBack {...icon_props} />
              </Button>
              {is_playing() ? (
                <Button {...button_props} onclick={() => set_is_playing(false)}>
                  <Pause {...icon_props} />
                </Button>
              ) : (
                <Button {...button_props} onclick={() => set_is_playing(true)}>
                  <Play {...icon_props} onclick={() => set_is_playing(true)} />
                </Button>
              )}
              <Button {...button_props} onclick={skipForward}>
                <SkipForward {...icon_props} />
              </Button>
            </div>
          </div>
        </div>
      </Match>
    </Switch>
  </Show>
</div>*/
