// js/sensors.js

const REPLAY_SAMPLE_RATE_MS = 1200;
const REPLAY_LENGTH = 500;
const REPLAY_START_ISO = "2024-05-24T10:42:00.000Z";
const REPLAY_SEED = 4201;

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildReplayDataset() {
  const rng = mulberry32(REPLAY_SEED);
  const data = [];
  const baseTime = new Date(REPLAY_START_ISO).getTime();

  let battery = 94.5;
  let depth = 2.4;
  let speed = 1.2;
  let heading = 182;
  let pitch = 1.2;
  let roll = -0.8;
  let yaw = 182;
  let lat = 26.350;
  let lon = 50.230;

  for (let i = 0; i < REPLAY_LENGTH; i += 1) {
    const jitter = Math.round((rng() - 0.5) * 240);
    const timestamp = new Date(baseTime + i * REPLAY_SAMPLE_RATE_MS + jitter);

    speed = clamp(speed + (rng() - 0.5) * 0.18, 0.6, 2.2);
    heading = (heading + (rng() - 0.5) * 6 + 360) % 360;
    yaw = heading;

    depth = clamp(depth + (rng() - 0.5) * 0.35, 1.2, 8.4);
    pitch = clamp(pitch + (rng() - 0.5) * 0.5, -6, 6);
    roll = clamp(roll + (rng() - 0.5) * 0.5, -8, 8);

    const speedMs = speed * 0.514444;
    const headingRad = (heading * Math.PI) / 180;
    lat += (Math.cos(headingRad) * speedMs) / 111111 * 0.9;
    lon += (Math.sin(headingRad) * speedMs) / (111111 * Math.cos((lat * Math.PI) / 180)) * 0.9;

    battery = clamp(battery - 0.004 - rng() * 0.003, 72, 100);

    const temperature = clamp(22.4 + depth * 0.22 + (rng() - 0.5) * 0.4, 20, 28);
    const pressure = clamp(101.3 + depth * 1.2 + (rng() - 0.5) * 0.6, 100, 112);
    const sonarStatus = i % 40 < 30 ? "active" : "standby";

    data.push({
      timestamp: timestamp.toISOString(),
      battery: Number(battery.toFixed(1)),
      depth: Number(depth.toFixed(2)),
      pitch: Number(pitch.toFixed(2)),
      roll: Number(roll.toFixed(2)),
      yaw: Number(yaw.toFixed(2)),
      speed: Number(speed.toFixed(2)),
      heading: Number(heading.toFixed(1)),
      temperature: Number(temperature.toFixed(2)),
      pressure: Number(pressure.toFixed(2)),
      sonar_status: sonarStatus,
      latitude: Number(lat.toFixed(5)),
      longitude: Number(lon.toFixed(5)),
      data_mode: "replay",
      replay_seed: REPLAY_SEED,
      replay_index: i + 1,
      sample_rate_ms: REPLAY_SAMPLE_RATE_MS,
    });
  }

  return data;
}

const replayData = buildReplayDataset();
let replayIndex = 0;
let replayCycle = 1;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateSensorUI(entry) {
  if (!entry) return;

  setText("temp", entry.temperature);
  setText("pressure", entry.pressure);
  setText("depth", entry.depth);
  setText("latitude", entry.latitude);
  setText("longitude", entry.longitude);
  setText("groundspeed", entry.speed);
  setText("battery", entry.battery);
  setText("flight_time", `${Math.round((entry.replay_index * REPLAY_SAMPLE_RATE_MS) / 1000)}s`);

  setText("roll", entry.roll);
  setText("pitch", entry.pitch);
  setText("yaw", entry.yaw);
  setText("heading", entry.heading);

  const needle = document.getElementById("compass-needle");
  const headingValue = document.getElementById("heading-value");
  if (needle && typeof entry.heading === "number") {
    needle.style.transform = `rotate(${entry.heading}deg)`;
  }
  if (headingValue) {
    headingValue.textContent =
      typeof entry.heading === "number" ? `${entry.heading}` : "--";
  }

  setText("telemetry-updated", entry.timestamp);
  setText("telemetry-entry", entry.replay_index);
  setText("telemetry-total", replayData.length);
  setText("telemetry-cycle", replayCycle);
  setText("telemetry-mode", `data_mode: ${entry.data_mode}`);
}

function advanceReplay() {
  const entry = replayData[replayIndex];
  updateSensorUI(entry);

  replayIndex += 1;
  if (replayIndex >= replayData.length) {
    replayIndex = 0;
    replayCycle += 1;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  advanceReplay();
  setInterval(advanceReplay, REPLAY_SAMPLE_RATE_MS);
});
