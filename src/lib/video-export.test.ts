import { it, expect } from "vitest";
import { chooseVideoMime, requireVideoTrack } from "./video-export";
it("rejects generic MP4 because it may contain gallery-incompatible VP9", () => {
  expect(
    chooseVideoMime(true, (s) =>
      ["video/mp4", "video/webm;codecs=vp8,opus"].includes(s),
    ),
  ).toContain("vp8");
  expect(chooseVideoMime(true, (s) => s.includes("avc1.420028"))).toContain(
    "avc1",
  );
});

it("uses VP8 before VP9 for the WebM fallback and never selects an audio MIME", () => {
  expect(
    chooseVideoMime(true, (s) => s.startsWith("video/webm;codecs=")),
  ).toContain("vp8");
  expect(() => chooseVideoMime(true, () => false)).toThrow();
});
it("rejects audio-only and ended video streams", () => {
  expect(() =>
    requireVideoTrack({ getVideoTracks: () => [] } as unknown as MediaStream),
  ).toThrow(/video track/);
  expect(() =>
    requireVideoTrack({
      getVideoTracks: () => [{ readyState: "ended" }],
    } as unknown as MediaStream),
  ).toThrow();
});
