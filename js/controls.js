// js/controls.js

const buttonNames = {
  0: "Cross",
  1: "Circle",
  2: "Square",
  3: "Triangle",
  4: "L1",
  5: "R1",
  6: "L2",
  7: "R2",
  8: "Share",
  9: "Options",
  10: "L3",
  11: "R3",
  12: "D-Pad Up",
  13: "D-Pad Down",
  14: "D-Pad Left",
  15: "D-Pad Right",
  16: "PS",
};

function showGamepadStatus() {
  const container = document.getElementById("gamepad-status");
  if (!container) return;

  window.addEventListener("gamepadconnected", (event) => {
    const gp = event.gamepad;
    container.innerHTML = `
      <p>Controller connected: <strong>${gp.id}</strong></p>
      <div class="gamepad-box">Listening for input...</div>
    `;
    startGamepadLoop(gp.index, container);
  });

  window.addEventListener("gamepaddisconnected", () => {
    container.innerHTML = `
      <p>No controller connected.</p>
      <p>Connect your PS4 controller via USB or Bluetooth to see input data here.</p>
    `;
  });
}

function startGamepadLoop(index, container) {
  function updateStatus() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[index];
    if (!gp) {
      requestAnimationFrame(updateStatus);
      return;
    }

    const axesHtml = gp.axes
      .map((a, i) => `<div>Axis ${i}: ${a.toFixed(2)}</div>`)
      .join("");

    const pressedButtons = gp.buttons
      .map((btn, i) => (btn.pressed ? buttonNames[i] || `Button ${i}` : null))
      .filter(Boolean)
      .join(" | ");

    const box = container.querySelector(".gamepad-box");
    if (box) {
      box.innerHTML = `
        <strong>Axes:</strong>
        <div>${axesHtml || "None"}</div>
        <br />
        <strong>Buttons Pressed:</strong>
        <div>${pressedButtons || "None"}</div>
      `;
    }

    requestAnimationFrame(updateStatus);
  }

  updateStatus();
}

document.addEventListener("DOMContentLoaded", showGamepadStatus);
