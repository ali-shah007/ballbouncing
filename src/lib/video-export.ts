/** Prefer broadly playable MP4; use VP8 rather than VP9 for WebM fallback. */
export function chooseVideoMime(
  audio = true,
  supported = (s: string) => MediaRecorder.isTypeSupported(s),
) {
  const formats = audio
    ? [
        "video/mp4;codecs=avc1.420028,mp4a.40.2",
        "video/mp4;codecs=avc1.640028,mp4a.40.2",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/webm;codecs=vp9,opus",
      ]
    : ["video/mp4;codecs=avc1.420028", "video/webm;codecs=vp8", "video/webm"];
  const mime = formats.find(supported);
  if (!mime)
    throw Error(
      "No video encoder is available. Please use an up-to-date Chrome or Safari browser.",
    );
  return mime;
}
export function requireVideoTrack(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  if (!track || track.readyState !== "live")
    throw Error(
      "The browser did not provide a live video track. No audio-only file will be saved.",
    );
  return track;
}
export function validateVideo(
  blob: Blob,
  minimumEnd = 0,
): Promise<{ width: number; height: number }> {
  if (!blob.size || !blob.type.startsWith("video/"))
    return Promise.reject(Error("No valid video was recorded."));
  return new Promise((resolve, reject) => {
    const v = document.createElement("video"),
      url = URL.createObjectURL(blob);
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    let callback = 0;
    const cleanup = () => {
      if (callback) v.cancelVideoFrameCallback(callback);
      v.pause();
      clearTimeout(timeout);
      v.onloadeddata = null;
      v.onerror = null;
      v.removeAttribute("src");
      v.load();
      URL.revokeObjectURL(url);
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        Error(
          "The video did not contain frames through the end of the recording. Keep this tab visible and try again with a lower population limit.",
        ),
      );
    }, 20000);
    v.onerror = () => {
      cleanup();
      reject(
        Error(
          "This browser could not decode the recorded picture. Please retry in current Chrome or Safari.",
        ),
      );
    };
    v.onloadeddata = () => {
      v.onloadeddata = null;
      const width = v.videoWidth,
        height = v.videoHeight;
      if (!(width > 0 && height > 0)) {
        cleanup();
        reject(
          Error(
            "Only audio was captured. Please retry with the tab visible; no audio-only download was created.",
          ),
        );
        return;
      }
      if (minimumEnd > 0 && typeof v.requestVideoFrameCallback === "function") {
        // Audio duration alone cannot prove that pictures survived until the ending.
        const check: VideoFrameRequestCallback = (_, metadata) => {
          if (metadata.mediaTime >= minimumEnd - 0.75) {
            cleanup();
            resolve({ width, height });
          } else callback = v.requestVideoFrameCallback(check);
        };
        callback = v.requestVideoFrameCallback(check);
        v.currentTime = minimumEnd;
        void v.play().catch(() => {
          cleanup();
          reject(
            Error(
              "Video playback verification failed. Please retry in current Chrome or Safari.",
            ),
          );
        });
      } else {
        cleanup();
        resolve({ width, height });
      }
    };
    v.src = url;
    v.load();
  });
}
let previousURL = "";
/** Keep a real, user-clickable download available after automatic download attempts. */
export async function offerVideo(blob: Blob, name: string) {
  await validateVideo(blob);
  if (previousURL) URL.revokeObjectURL(previousURL);
  previousURL = URL.createObjectURL(blob);
  document.getElementById("orbit-video-download")?.remove();
  const a = document.createElement("a");
  a.id = "orbit-video-download";
  a.href = previousURL;
  a.download = name;
  a.textContent = "Download video ↗";
  a.style.cssText =
    "position:fixed;bottom:22px;right:22px;z-index:10000;padding:16px 22px;background:#b8f481;color:#152119;border-radius:12px;font:700 15px system-ui;box-shadow:0 8px 30px #0005";
  document.body.append(a);
  a.click();
}
export type VideoCapture = {
  stop: () => void;
  abort: () => void;
  done: Promise<Blob>;
  canvas: HTMLCanvasElement;
};
export function captureVideo(
  paint: (ctx: CanvasRenderingContext2D, dt: number) => void,
  audio: MediaStreamTrack[],
  seconds: number,
): VideoCapture {
  if (typeof MediaRecorder === "undefined")
    throw Error(
      "This browser cannot record videos. Try current Chrome or Safari.",
    );
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  })!;
  paint(ctx, 0);
  if (!canvas.captureStream)
    throw Error("Canvas video recording is unavailable in this browser.");
  let video = canvas.captureStream(0);
  let track = requireVideoTrack(video) as CanvasCaptureMediaStreamTrack;
  if (typeof track.requestFrame !== "function") {
    video.getTracks().forEach((t) => t.stop());
    video = canvas.captureStream(24);
    track = requireVideoTrack(video) as CanvasCaptureMediaStreamTrack;
  }
  const stream = new MediaStream([
    ...video.getVideoTracks(),
    ...audio.map((t) => t.clone()),
  ]);
  let rec: MediaRecorder;
  try {
    rec = new MediaRecorder(stream, {
      mimeType: chooseVideoMime(audio.length > 0),
      videoBitsPerSecond: 6000000,
      audioBitsPerSecond: 192000,
    });
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    throw e;
  }
  let frames = 0,
    last = performance.now(),
    failure = "",
    finished = false,
    recordedSeconds = 0;
  const chunks: BlobPart[] = [];
  let tick: ReturnType<typeof setInterval> | undefined,
    deadline: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => {
    if (tick) clearInterval(tick);
    if (deadline) clearTimeout(deadline);
    stream.getTracks().forEach((t) => t.stop());
  };
  const done = new Promise<Blob>((resolve, reject) => {
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onerror = () => {
      failure = "The video encoder failed. Try a shorter clip in Chrome.";
      if (rec.state !== "inactive") rec.stop();
      else {
        cleanup();
        reject(Error(failure));
      }
    };
    rec.onstop = async () => {
      cleanup();
      if (finished) return;
      finished = true;
      try {
        if (failure) throw Error(failure);
        if (frames < 2)
          throw Error(
            "Not enough video frames were captured. Record for at least one second.",
          );
        const blob = new Blob(chunks, { type: rec.mimeType.split(";")[0] });
        const size = await validateVideo(
          blob,
          Math.max(0, recordedSeconds - 0.5),
        );
        if (size.width !== 1080 || size.height !== 1920)
          throw Error("The captured video has an unexpected resolution.");
        resolve(blob);
      } catch (e) {
        reject(e);
      }
    };
  });
  function stop() {
    recordedSeconds = (performance.now() - started) / 1000;
    if (tick) clearInterval(tick);
    if (rec.state !== "inactive") rec.stop();
  }
  function abort() {
    failure = "Recording cancelled.";
    stop();
  }
  const started = performance.now();
  try {
    rec.start(500);
    track.requestFrame?.();
    frames++;
    tick = setInterval(() => {
      try {
        if (track.readyState !== "live")
          throw Error("Video capture was interrupted.");
        const now = performance.now();
        paint(ctx, Math.max(0, (now - last) / 1000));
        last = now;
        // Flush deferred canvas drawing before requesting a frame. Otherwise a
        // busy raster backend can leave the recorder encoding stale queued pictures.
        ctx.getImageData(0, 0, 1, 1);
        track.requestFrame?.();
        frames++;
      } catch (e) {
        failure = e instanceof Error ? e.message : "Video rendering failed.";
        stop();
      }
    }, 1000 / 24);
    deadline = setTimeout(stop, seconds * 1000);
  } catch (e) {
    cleanup();
    throw e;
  }
  return { stop, abort, done, canvas };
}
