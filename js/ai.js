// js/ai.js

const DETECTION_VIDEO_ID = "detection-video";
const DETECTION_SOURCE_PATH = "assets/genAI_detected_cracks2_encoded.mp4";
const VIDEO_META_ID = "video-meta";
const PLAYBACK_RATE = 0.8;

function refreshDetectionVideo() {
  const video = document.getElementById(DETECTION_VIDEO_ID);
  if (!video) return;

  const source = video.querySelector("source");
  if (!source) return;

  source.src = `${DETECTION_SOURCE_PATH}?t=${Date.now()}`;
  video.load();
}

function updateVideoMeta(video) {
  const meta = document.getElementById(VIDEO_META_ID);
  if (!meta || !video) return;

  const width = video.videoWidth || 0;
  const height = video.videoHeight || 0;
  const duration =
    Number.isFinite(video.duration) && video.duration > 0
      ? `${video.duration.toFixed(1)}s`
      : "unknown";

  const resolution = width && height ? `${width}x${height}` : "unknown";
  meta.textContent = `| Resolution: ${resolution} | Duration: ${duration} | Playback: ${PLAYBACK_RATE}x`;
}

document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById(DETECTION_VIDEO_ID);
  if (!video) return;

  video.playbackRate = PLAYBACK_RATE;
  video.addEventListener("loadedmetadata", () => updateVideoMeta(video));
});
