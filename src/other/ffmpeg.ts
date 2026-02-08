import { invoke } from "@tauri-apps/api/core";

const ffprobe_path = "/bin/ffprobe";
const ffmpeg_path = "/bin/ffmpeg";
interface CommandResult {
  status: number;
  stdout: number[];
  stderr: number[];
  error: string;
}
interface FFProbeOutput {
  streams: FFProbeStream[];
  format: FFProbeFormat;
}

interface FFProbeStream {
  index: number;
  codec_name: string;
  codec_long_name: string;
  codec_type: "audio" | "video" | "subtitle" | "data";
  codec_tag_string: string;
  codec_tag: string;
  width?: number;
  height?: number;
  coded_width?: number;
  coded_height?: number;
  pix_fmt?: string;
  display_aspect_ratio?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  bits_per_sample?: number;
  r_frame_rate: string;
  avg_frame_rate: string;
  time_base: string;
  duration: string;
  bit_rate?: string;

  disposition: Record<string, number>;
  tags?: Record<string, string>;
}

interface FFProbeFormat {
  filename: string;
  nb_streams: number;
  format_name: string;
  format_long_name: string;
  duration: string;
  size: string;
  bit_rate: string;
  tags?: FFProbeTags;
}

interface FFProbeTags {
  TITLE?: string;
  ARTIST?: string;
  ALBUM?: string;
  DATE?: string;
  GENRE?: string;
  UNSYNCEDLYRICS?: string;
  [key: string]: string | undefined;
}

async function ffprobe(file: string): Promise<FFProbeOutput> {
  let { stdout, stderr, status, error }: CommandResult = await invoke(
    "command",
    {
      file: ffprobe_path,
      args: "-v quiet -of json -show_format -show_streams"
        .split(" ")
        .concat(file),
    },
  );
  if (error) throw error;
  console.log({ stdout, stderr, status, error });
  console.log(String.fromCharCode(...stdout));
  if (status !== 0) throw String.fromCharCode(...stderr);
  return JSON.parse(String.fromCharCode(...stdout));
}

export {
  type FFProbeOutput,
  type FFProbeStream,
  type FFProbeFormat,
  type CommandResult,
  ffmpeg_path,
  ffprobe_path,
  ffprobe,
};
