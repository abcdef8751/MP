const platform = await invoke("platform"); //window.navigator.platform.split(" ")[0].toLowerCase;
const ffprobe_path = "/bin/ffprobe";
const ffmpeg_path = "/bin/ffmpeg";
const cache_dir = await path.join(await invoke("home_dir"), ".cache/nev");
export default {
  platform,
  ffprobe_path,
  ffmpeg_path,
  cache_dir,
};
