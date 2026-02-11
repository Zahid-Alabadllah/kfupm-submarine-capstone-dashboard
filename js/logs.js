// js/logs.js

const LOG_SAMPLE_RATE_MS = 1000;
const LOG_LENGTH = 5000;
const LOG_SEED = 6139;
const LOG_START_ISO = "2024-05-24T12:30:00.000Z";
const LOG_DISPLAY_LIMIT = 250;

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

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function buildLogDataset() {
  const rng = mulberry32(LOG_SEED);
  const data = [];
  const baseTime = new Date(LOG_START_ISO).getTime();

  const start = { lat: 26.350, lon: 50.230 };
  const end = { lat: 26.462, lon: 50.118 };

  let battery = 93.2;
  let roll = 0.3;
  let pitch = -0.4;
  let yaw = 185;
  let heading = 185;
  let speed = 1.1;
  let depth = 2.8;

  let prevLat = start.lat;
  let prevLon = start.lon;

  for (let i = 0; i < LOG_LENGTH; i += 1) {
    const progress = i / (LOG_LENGTH - 1);
    const drift = Math.sin(progress * Math.PI * 6) * 0.00035;
    const drift2 = Math.cos(progress * Math.PI * 4) * 0.0002;
    const lat = lerp(start.lat, end.lat, progress) + drift;
    const lon = lerp(start.lon, end.lon, progress) + drift2;

    const dLat = lat - prevLat;
    const dLon = lon - prevLon;
    const headingRad = Math.atan2(dLon, dLat);
    heading = (headingRad * (180 / Math.PI) + 360) % 360;
    yaw = heading;

    speed = clamp(speed + (rng() - 0.5) * 0.15, 0.7, 2.6);
    depth = clamp(depth + (rng() - 0.5) * 0.3 + speed * 0.02, 1.8, 9.2);
    roll = clamp(roll + (rng() - 0.5) * 0.6, -10, 10);
    pitch = clamp(pitch + (rng() - 0.5) * 0.5, -6, 6);

    const temperature = clamp(22.6 + depth * 0.18 + (rng() - 0.5) * 0.4, 20, 28);
    const pressure = clamp(101.2 + depth * 1.25 + (rng() - 0.5) * 0.6, 100, 114);

    battery = clamp(battery - 0.003 - rng() * 0.004, 68, 100);

    const phase =
      progress < 0.2
        ? "Harbor Exit"
        : progress < 0.7
        ? "Transit"
        : progress < 0.9
        ? "Coastal Approach"
        : "Station Keeping";

    const sonarStatus =
      progress < 0.1 ? "calibrating" : progress < 0.85 ? "mapping" : "active";

    const warnings =
      i % 900 === 0
        ? "minor turbulence"
        : i % 1400 === 0
        ? "thruster variance"
        : "none";

    data.push({
      id: 4021 + i,
      timestamp: new Date(baseTime + i * LOG_SAMPLE_RATE_MS).toISOString(),
      cycle: 1,
      phase,
      status: "nominal",
      warnings,
      temperature: Number(temperature.toFixed(2)),
      pressure: Number(pressure.toFixed(2)),
      depth: Number(depth.toFixed(3)),
      latitude: Number(lat.toFixed(5)),
      longitude: Number(lon.toFixed(5)),
      roll: Number(roll.toFixed(2)),
      pitch: Number(pitch.toFixed(2)),
      yaw: Number(yaw.toFixed(2)),
      heading: Number(heading.toFixed(1)),
      speed: Number(speed.toFixed(2)),
      battery: Number(battery.toFixed(1)),
      flight_time: Math.round((i * LOG_SAMPLE_RATE_MS) / 1000),
      sonar_status: sonarStatus,
      data_mode: "live",
      mission_seed: LOG_SEED,
      sample_rate_hz: 1000 / LOG_SAMPLE_RATE_MS,
    });

    prevLat = lat;
    prevLon = lon;
  }

  return data;
}

const logDataset = buildLogDataset();
let liveIndex = 0;
let liveCycle = 1;

function publishMissionPath() {
  const path = logDataset.map((entry) => [entry.latitude, entry.longitude]);
  const lastEntry = logDataset[logDataset.length - 1];
  if (!lastEntry) return;

  const lastSeen = {
    coords: [lastEntry.latitude, lastEntry.longitude],
    timestamp: lastEntry.timestamp,
  };

  if (typeof window.setMissionPath === "function") {
    window.setMissionPath(path, lastSeen);
  } else {
    window.logPath = path;
    window.lastSeen = lastSeen;
  }

  setText("last-seen", `Last Time Seen: ${lastEntry.timestamp}`);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateSchema() {
  const schema = [
    "Schema: timestamp (ISO8601), temp(C), pressure(kPa), depth(m), lat, lon, roll/pitch/yaw/heading(deg), speed(kn), battery(%), flight_time(s)",
    "Meta: cycle, phase, status, warnings, sonar_status, data_mode",
  ].join(" | ");
  setText("log-schema", schema);
}

function updateToolbarMeta(entry) {
  if (!entry) return;
  setText("log-cycle", `Cycle ${liveCycle}`);
  setText("log-phase", `Phase: ${entry.phase}`);
  setText("log-sample-rate", `Sample: ${entry.sample_rate_hz} Hz`);
  setText("logs-meta", `data_mode: replay | sonar_status: ${entry.sonar_status}`);
}

function appendLogRow(entry) {
  const tbody = document.getElementById("log-body");
  if (!tbody || !entry) return;

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${entry.id}</td>
    <td>${entry.timestamp}</td>
    <td>${entry.cycle}</td>
    <td>${entry.phase}</td>
    <td>${entry.status}</td>
    <td>${entry.warnings}</td>
    <td>${entry.temperature}</td>
    <td>${entry.pressure}</td>
    <td>${entry.depth}</td>
    <td>${entry.latitude}</td>
    <td>${entry.longitude}</td>
    <td>${entry.roll}</td>
    <td>${entry.pitch}</td>
    <td>${entry.yaw}</td>
    <td>${entry.heading}</td>
    <td>${entry.speed}</td>
    <td>${entry.battery}</td>
    <td>${entry.flight_time}</td>
  `;
  tbody.appendChild(row);

  while (tbody.children.length > LOG_DISPLAY_LIMIT) {
    tbody.removeChild(tbody.firstChild);
  }
}

function advanceLogStream() {
  const entry = { ...logDataset[liveIndex], cycle: liveCycle };
  appendLogRow(entry);
  updateToolbarMeta(entry);
  setText("logs-updated", entry.timestamp);

  liveIndex += 1;
  if (liveIndex >= logDataset.length) {
    liveIndex = 0;
    liveCycle += 1;
  }
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const headers = [
    "id",
    "timestamp",
    "cycle",
    "phase",
    "status",
    "warnings",
    "temperature_c",
    "pressure_kpa",
    "depth_m",
    "lat",
    "lon",
    "roll_deg",
    "pitch_deg",
    "yaw_deg",
    "heading_deg",
    "speed_kn",
    "battery_pct",
    "flight_time_s",
    "sonar_status",
    "data_mode",
  ];

  const lines = [headers.join(",")];
  logDataset.forEach((entry) => {
    lines.push(
      [
        entry.id,
        entry.timestamp,
        liveCycle,
        entry.phase,
        entry.status,
        entry.warnings,
        entry.temperature,
        entry.pressure,
        entry.depth,
        entry.latitude,
        entry.longitude,
        entry.roll,
        entry.pitch,
        entry.yaw,
        entry.heading,
        entry.speed,
        entry.battery,
        entry.flight_time,
        entry.sonar_status,
        entry.data_mode,
      ].join(",")
    );
  });

  downloadFile(lines.join("\n"), "telemetry_stream.csv", "text/csv");
}

function exportJsonl() {
  const lines = logDataset.map((entry) =>
    JSON.stringify({ ...entry, cycle: liveCycle })
  );
  downloadFile(lines.join("\n"), "telemetry_stream.jsonl", "application/json");
}

document.addEventListener("DOMContentLoaded", () => {
  updateSchema();

  const tbody = document.getElementById("log-body");
  if (tbody) {
    tbody.innerHTML = "";
  }

  const csvBtn = document.getElementById("export-csv");
  const jsonlBtn = document.getElementById("export-jsonl");
  if (csvBtn) csvBtn.addEventListener("click", exportCsv);
  if (jsonlBtn) jsonlBtn.addEventListener("click", exportJsonl);

  publishMissionPath();
  advanceLogStream();
  setInterval(advanceLogStream, LOG_SAMPLE_RATE_MS);
});
