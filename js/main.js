// js/main.js

let mapInstance = null;
let mapInitialized = false;
let missionPathLayer = null;
let lastSeenMarker = null;
let pendingMapMode = null;

const PAGE_COPY = {
  home: {
    title: "Home",
    subtitle:
      "Overview of the Miniature Autonomous Submarine and the project team.",
  },
  sensors: {
    title: "Sensor Data",
    subtitle: "Real-time telemetry and attitude information.",
  },
  ai: {
    title: "AI Detection",
    subtitle: "Sample crack detection output from the AI model.",
  },
  controls: {
    title: "Controls",
    subtitle: "Gamepad mapping and virtual controller view.",
  },
  logs: {
    title: "Data Logs",
    subtitle: "Historical sensor log viewer.",
  },
};

function setActiveSection(sectionId) {
  const sections = document.querySelectorAll(".page-section");
  const navButtons = document.querySelectorAll("[data-section-target]");
  const pageTitle = document.getElementById("page-title");
  const pageSubtitle = document.getElementById("page-subtitle");

  sections.forEach((section) => {
    const id = section.getAttribute("data-section");
    section.classList.toggle("is-active", id === sectionId);
  });

  navButtons.forEach((btn) => {
    const id = btn.getAttribute("data-section-target");
    btn.classList.toggle("is-active", id === sectionId);
  });

  const copy = PAGE_COPY[sectionId] || PAGE_COPY.home;
  if (pageTitle) pageTitle.textContent = copy.title;
  if (pageSubtitle) pageSubtitle.textContent = copy.subtitle;

  if (sectionId === "sensors" && !mapInitialized) {
    initMap();
    mapInitialized = true;
  }

  if (sectionId === "sensors" && mapInstance) {
    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 150);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initMap() {
  const mapElement = document.getElementById("map");
  if (!mapElement || typeof L === "undefined") return;

  if (mapInstance) return;

  const coords = [26.301285417846728, 50.158607];

  mapInstance = L.map("map").setView(coords, 18);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(mapInstance);

  L.marker(coords)
    .addTo(mapInstance)
    .bindPopup("KFUPM - DTV (Submarine HQ)")
    .openPopup();

  setTimeout(() => {
    mapInstance.invalidateSize();
  }, 0);

  setupMapMode();
  if (pendingMapMode) {
    applyMapMode(pendingMapMode);
    pendingMapMode = null;
  }
}

function setupMapMode() {
  const modeSelect = document.getElementById("map-mode");
  if (!modeSelect) return;

  modeSelect.addEventListener("change", (event) => {
    applyMapMode(event.target.value);
  });
}

function applyMapMode(mode) {
  if (!mapInstance) {
    pendingMapMode = mode;
    return;
  }

  const overlay = document.getElementById("map-overlay");
  if (overlay) {
    overlay.classList.toggle("is-hidden", mode === "mission");
  }

  if (mode === "mission") {
    if (!window.logPath || !window.lastSeen) {
      return;
    }

    if (!missionPathLayer) {
      missionPathLayer = L.polyline(window.logPath, {
        color: "#13c8ec",
        weight: 3,
        opacity: 0.85,
      }).addTo(mapInstance);
    }

    if (!lastSeenMarker) {
      lastSeenMarker = L.marker(window.lastSeen.coords).addTo(mapInstance);
      lastSeenMarker.bindPopup(
        `Last Time Seen<br>${window.lastSeen.timestamp}`,
        {
          closeButton: false,
        }
      );
    }

    setTimeout(() => {
      mapInstance.fitBounds(missionPathLayer.getBounds(), {
        padding: [30, 30],
      });
    }, 0);
  } else {
    if (missionPathLayer) {
      mapInstance.removeLayer(missionPathLayer);
      missionPathLayer = null;
    }
    if (lastSeenMarker) {
      mapInstance.removeLayer(lastSeenMarker);
      lastSeenMarker = null;
    }
    mapInstance.setView([26.301285417846728, 50.158607], 18);
  }
}

window.setMissionPath = function setMissionPath(path, lastSeen) {
  window.logPath = path;
  window.lastSeen = lastSeen;
  if (pendingMapMode) {
    applyMapMode(pendingMapMode);
    pendingMapMode = null;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const navButtons = document.querySelectorAll("[data-section-target]");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const sectionId = btn.getAttribute("data-section-target");
      setActiveSection(sectionId);
    });
  });

  setActiveSection("home");
});
