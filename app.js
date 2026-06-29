/**
 * Main Application Orchestrator and Simulation Loop
 */

// Global State
let robot;
let gamepadHandler;
let canvas, ctx;
let lastTime = 0;
let speedMultiplier = 1.0;
let rotSpeedMultiplier = 1.0;
let showTrail = true;
let showGrid = true;
let showVectors = true;
let isFieldCentric = false;
let lockRobotPosition = false;
let isHeadingLock = false;
let targetHeadingValue = 0.0;
let hasTargetHeading = false;

// Virtual Joysticks State
let joysticks = {
  left: { active: false, x: 0, y: 0, startX: 0, startY: 0, currentX: 0, currentY: 0 },
  right: { active: false, x: 0, y: 0, startX: 0, startY: 0, currentX: 0, currentY: 0 }
};

// Keyboard State
const activeKeys = new Set();

// Telemetry History for Oscilloscope Chart
const telemetryHistory = [];
const maxHistoryLength = 200;
let chartCanvas, chartCtx;

// Active Drivetrains
const DRIVETRAINS = ["mecanum", "omni", "omni3", "tank"];
let activeDrivetrainIndex = 0;

// Explanations for Drivetrains
const DT_EXPLANATIONS = {
  mecanum: `
    <strong>Mecanum Kinematics</strong><br>
    Uses 4 wheels with rollers oriented at 45°.
    <ul>
      <li><strong>Forward:</strong> Wheels spin in opposing pairs to cancel lateral vectors.</li>
      <li><strong>Strafe:</strong> Wheels spin in matching adjacent pairs to push sideways.</li>
      <li><strong>Rotate:</strong> All wheels spin in the same physical direction, spinning the robot chassis.</li>
    </ul>
    <code>FL = Vy + Vx + Vrot</code><br>
    <code>FR = -Vy + Vx + Vrot</code><br>
    <code>BL = Vy - Vx + Vrot</code><br>
    <code>BR = -Vy - Vx + Vrot</code>
  `,
  omni: `
    <strong>Omni-wheel (4W) Kinematics</strong><br>
    Similar to Mecanum, but wheels are physically rotated at 45° corners.
    <ul>
      <li>Exerts force perpendicular to the roller axis.</li>
      <li>Rollers spin freely along the wheel direction, allowing slide.</li>
      <li>Maintains same kinematic calculations as Mecanum but changes roller angles.</li>
    </ul>
  `,
  omni3: `
    <strong>Omni-wheel (3W / Kiwi) Kinematics</strong><br>
    Uses 3 Omni wheels spaced at 120° angles to provide holonomic motion.
    <ul>
      <li><strong>Back Wheel:</strong> Drives purely horizontally.</li>
      <li><strong>FR & FL Wheels:</strong> Positioned at angles to resolve forward & lateral forces.</li>
      <li>Enables full translation and rotation with only 3 motors.</li>
    </ul>
    <code>Wheel0 (Back) = -Vx + Vrot</code><br>
    <code>Wheel1 (FR) = 0.5*Vx - 0.866*Vy + Vrot</code><br>
    <code>Wheel2 (FL) = 0.5*Vx + 0.866*Vy + Vrot</code>
  `,
  tank: `
    <strong>Tank / Skid-Steer Kinematics</strong><br>
    Uses 2 independent tracks or wheels on each side.
    <ul>
      <li>Cannot move laterally (cannot strafe sideways).</li>
      <li><strong>Forward:</strong> Left and right wheels spin in opposite directions (right side inverted).</li>
      <li><strong>Turn:</strong> Both wheels spin in the same direction, sliding the chassis in a circle.</li>
    </ul>
    <code>Left = Vy + Vrot</code><br>
    <code>Right = -Vy + Vrot</code>
  `
};

// Colors for wheel telemetry
const WHEEL_COLORS = ["#3b82f6", "#ec4899", "#8b5cf6", "#f59e0b"]; // FL (Blue), FR (Pink), BL (Purple), BR (Orange)

/**
 * Initialize Canvas Size
 */
function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  
  // Center robot if it's new
  if (robot) {
    // Keep robot in bounds
    if (robot.x < 50 || robot.x > canvas.width - 50 || robot.y < 50 || robot.y > canvas.height - 50) {
      robot.x = canvas.width / 2;
      robot.y = canvas.height / 2;
    }
  }
}

/**
 * Initialize Application
 */
window.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("sim-canvas");
  ctx = canvas.getContext("2d");
  
  chartCanvas = document.getElementById("chart-canvas");
  chartCtx = chartCanvas.getContext("2d");
  
  // Create Robot at center
  robot = new Robot(window.innerWidth / 2, window.innerHeight / 2);
  
  // Resize Canvas
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  robot.x = canvas.width / 2;
  robot.y = canvas.height / 2;

  // Initialize Gamepad Handler
  gamepadHandler = new GamepadHandler(handleGamepadInput);

  // Setup Event Listeners
  setupUIEventListeners();
  setupKeyboardEventListeners();
  setupTouchEventListeners();
  setupCustomGamepadActions();
  
  // Start Main Loop
  lastTime = performance.now();
  requestAnimationFrame(loop);

  // Set default description
  updateExplanationText();
  renderWheelGauges();
});

/**
 * Update active explanation card
 */
function updateExplanationText() {
  const container = document.getElementById("drivetrain-explanation");
  const activeDt = DRIVETRAINS[activeDrivetrainIndex];
  container.innerHTML = DT_EXPLANATIONS[activeDt];
}

/**
 * Bind UI Sidebar Control Events
 */
function setupUIEventListeners() {
  // Drivetrain selector buttons
  const buttons = document.querySelectorAll(".dt-btn");
  buttons.forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeDrivetrainIndex = idx;
      
      const type = btn.getAttribute("data-type");
      robot.setDrivetrain(type);
      
      // Update displays
      document.getElementById("txt-active-drivetrain").textContent = btn.querySelector("span").textContent;
      updateExplanationText();
      renderWheelGauges();
      telemetryHistory.length = 0; // reset graph
    });
  });

  // Toggles
  const fcToggle = document.getElementById("toggle-field-centric");
  fcToggle.addEventListener("change", (e) => {
    isFieldCentric = e.target.checked;
  });

  const lockToggle = document.getElementById("toggle-lock-position");
  lockToggle.addEventListener("change", (e) => {
    lockRobotPosition = e.target.checked;
    if (lockRobotPosition) {
      robot.x = canvas.width / 2;
      robot.y = canvas.height / 2;
    }
  });

  const hlToggle = document.getElementById("toggle-heading-lock");
  hlToggle.addEventListener("change", (e) => {
    isHeadingLock = e.target.checked;
    if (isHeadingLock) {
      targetHeadingValue = robot.rot;
      hasTargetHeading = true;
    } else {
      hasTargetHeading = false;
    }
  });

  const trailToggle = document.getElementById("toggle-trail");
  trailToggle.addEventListener("change", (e) => {
    showTrail = e.target.checked;
  });

  const gridToggle = document.getElementById("toggle-grid");
  gridToggle.addEventListener("change", (e) => {
    showGrid = e.target.checked;
  });

  const vectorsToggle = document.getElementById("toggle-vectors");
  vectorsToggle.addEventListener("change", (e) => {
    showVectors = e.target.checked;
  });

  // Sliders
  const speedSlider = document.getElementById("slider-speed");
  speedSlider.addEventListener("input", (e) => {
    speedMultiplier = parseFloat(e.target.value);
    document.getElementById("val-speed").textContent = speedMultiplier.toFixed(1) + "x";
  });

  const rotSlider = document.getElementById("slider-rot-speed");
  rotSlider.addEventListener("input", (e) => {
    rotSpeedMultiplier = parseFloat(e.target.value);
    document.getElementById("val-rot-speed").textContent = rotSpeedMultiplier.toFixed(1) + "x";
  });

  // Buttons
  document.getElementById("btn-reset").addEventListener("click", resetRobotPosition);
  document.getElementById("btn-clear-trail").addEventListener("click", () => {
    robot.trail = [];
  });
}

/**
 * Listen for custom gamepad shortcut events
 */
function setupCustomGamepadActions() {
  window.addEventListener("robot-reset", resetRobotPosition);
  
  window.addEventListener("toggle-fc", () => {
    const toggle = document.getElementById("toggle-field-centric");
    toggle.checked = !toggle.checked;
    isFieldCentric = toggle.checked;
  });

  window.addEventListener("clear-trail", () => {
    robot.trail = [];
  });

  window.addEventListener("toggle-vectors", () => {
    const toggle = document.getElementById("toggle-vectors");
    toggle.checked = !toggle.checked;
    showVectors = toggle.checked;
  });

  // Cycle Drivetrains
  window.addEventListener("dt-prev", () => {
    activeDrivetrainIndex = (activeDrivetrainIndex - 1 + DRIVETRAINS.length) % DRIVETRAINS.length;
    triggerDrivetrainChange();
  });

  window.addEventListener("dt-next", () => {
    activeDrivetrainIndex = (activeDrivetrainIndex + 1) % DRIVETRAINS.length;
    triggerDrivetrainChange();
  });

  window.addEventListener("toggle-lock", () => {
    const toggle = document.getElementById("toggle-lock-position");
    toggle.checked = !toggle.checked;
    lockRobotPosition = toggle.checked;
    if (lockRobotPosition) {
      robot.x = canvas.width / 2;
      robot.y = canvas.height / 2;
    }
  });

  window.addEventListener("toggle-heading-lock", () => {
    const toggle = document.getElementById("toggle-heading-lock");
    toggle.checked = !toggle.checked;
    isHeadingLock = toggle.checked;
    if (isHeadingLock) {
      targetHeadingValue = robot.rot;
      hasTargetHeading = true;
    } else {
      hasTargetHeading = false;
    }
  });

  window.addEventListener("toggle-trail", () =>>,StartLine:254,TargetContent: {
    const toggle = document.getElementById("toggle-trail");
    toggle.checked = !toggle.checked;
    showTrail = toggle.checked;
  });

  window.addEventListener("toggle-grid", () => {
    const toggle = document.getElementById("toggle-grid");
    toggle.checked = !toggle.checked;
    showGrid = toggle.checked;
  });

  window.addEventListener("speed-up", () => {
    const slider = document.getElementById("slider-speed");
    let val = parseFloat(slider.value) + 0.1;
    if (val > 2.0) val = 2.0;
    slider.value = val;
    speedMultiplier = val;
    document.getElementById("val-speed").textContent = val.toFixed(1) + "x";
  });

  window.addEventListener("speed-down", () => {
    const slider = document.getElementById("slider-speed");
    let val = parseFloat(slider.value) - 0.1;
    if (val < 0.1) val = 0.1;
    slider.value = val;
    speedMultiplier = val;
    document.getElementById("val-speed").textContent = val.toFixed(1) + "x";
  });

  window.addEventListener("rot-up", () => {
    const slider = document.getElementById("slider-rot-speed");
    let val = parseFloat(slider.value) + 0.1;
    if (val > 2.0) val = 2.0;
    slider.value = val;
    rotSpeedMultiplier = val;
    document.getElementById("val-rot-speed").textContent = val.toFixed(1) + "x";
  });

  window.addEventListener("rot-down", () => {
    const slider = document.getElementById("slider-rot-speed");
    let val = parseFloat(slider.value) - 0.1;
    if (val < 0.1) val = 0.1;
    slider.value = val;
    rotSpeedMultiplier = val;
    document.getElementById("val-rot-speed").textContent = val.toFixed(1) + "x";
  });
}

function triggerDrivetrainChange() {
  const type = DRIVETRAINS[activeDrivetrainIndex];
  const btn = document.getElementById(`btn-${type}`);
  if (btn) btn.click();
}

function resetRobotPosition() {
  robot.x = canvas.width / 2;
  robot.y = canvas.height / 2;
  robot.rot = 0;
  robot.trail = [];
  robot.resetSpeeds();
}

/**
 * Setup Keyboard Listeners
 */
function setupKeyboardEventListeners() {
  window.addEventListener("keydown", (e) => {
    // Prevent default scrolling behaviour for arrow keys & space
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }
    activeKeys.add(e.key.toLowerCase());
    
    // Quick shortcut keys
    if (e.key.toLowerCase() === 'r') {
      resetRobotPosition();
    } else if (e.key.toLowerCase() === 'm') {
      document.getElementById("btn-mecanum").click();
    } else if (e.key.toLowerCase() === 'o') {
      document.getElementById("btn-omni").click();
    } else if (e.key.toLowerCase() === 'k') {
      document.getElementById("btn-omni3").click();
    } else if (e.key.toLowerCase() === 't') {
      document.getElementById("btn-tank").click();
    }
  });

  window.addEventListener("keyup", (e) => {
    activeKeys.delete(e.key.toLowerCase());
  });
}

/**
 * Setup On-Screen Virtual Joysticks Mouse/Touch events
 */
function setupTouchEventListeners() {
  setupSingleJoystick("left", "joystick-left-base", "joystick-left-stick");
  setupSingleJoystick("right", "joystick-right-base", "joystick-right-stick");

  // Mouse Dragging for the robot positioning
  let draggingRobot = false;
  let dragOffset = { x: 0, y: 0 };

  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const targetX = lockRobotPosition ? canvas.width / 2 : robot.x;
    const targetY = lockRobotPosition ? canvas.height / 2 : robot.y;
    
    // Check if clicked inside robot radius (approx 120px)
    const dist = Math.hypot(mouseX - targetX, mouseY - targetY);
    if (dist < 120) {
      draggingRobot = true;
      dragOffset.x = robot.x - mouseX;
      dragOffset.y = robot.y - mouseY;
      canvas.style.cursor = "grabbing";
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    if (draggingRobot) {
      const rect = canvas.getBoundingClientRect();
      robot.x = e.clientX - rect.left + dragOffset.x;
      robot.y = e.clientY - rect.top + dragOffset.y;
    }
  });

  window.addEventListener("mouseup", () => {
    draggingRobot = false;
    canvas.style.cursor = "grab";
  });

  // Touch support for dragging robot
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      const rect = canvas.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      const touchY = e.touches[0].clientY - rect.top;
      
      const targetX = lockRobotPosition ? canvas.width / 2 : robot.x;
      const targetY = lockRobotPosition ? canvas.height / 2 : robot.y;
      
      const dist = Math.hypot(touchX - targetX, touchY - targetY);
      if (dist < 120) {
        draggingRobot = true;
        dragOffset.x = robot.x - touchX;
        dragOffset.y = robot.y - touchY;
      }
    }
  });

  canvas.addEventListener("touchmove", (e) => {
    if (draggingRobot && e.touches.length === 1) {
      const rect = canvas.getBoundingClientRect();
      robot.x = e.touches[0].clientX - rect.left + dragOffset.x;
      robot.y = e.touches[0].clientY - rect.top + dragOffset.y;
    }
  });

  canvas.addEventListener("touchend", () => {
    draggingRobot = false;
  });
}

function setupSingleJoystick(side, baseId, stickId) {
  const base = document.getElementById(baseId);
  const stick = document.getElementById(stickId);
  const wrapper = base.parentElement;

  const handleStart = (clientX, clientY) => {
    joysticks[side].active = true;
    const baseRect = base.getBoundingClientRect();
    joysticks[side].startX = baseRect.left + baseRect.width / 2;
    joysticks[side].startY = baseRect.top + baseRect.height / 2;
    wrapper.style.opacity = "0.95";
    wrapper.style.borderColor = "var(--accent)";
  };

  const handleMove = (clientX, clientY) => {
    if (!joysticks[side].active) return;
    
    let dx = clientX - joysticks[side].startX;
    let dy = clientY - joysticks[side].startY;
    
    // Clamp to max radius of 30px
    const maxRadius = 30;
    const distance = Math.hypot(dx, dy);
    
    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }
    
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
    
    // Normalize coordinates -1.0 to 1.0
    joysticks[side].x = dx / maxRadius;
    joysticks[side].y = -dy / maxRadius; // Invert to make Y positive pushing up
  };

  const handleEnd = () => {
    joysticks[side].active = false;
    joysticks[side].x = 0;
    joysticks[side].y = 0;
    stick.style.transform = "translate(0px, 0px)";
    wrapper.style.opacity = "0.2";
    wrapper.style.borderColor = "rgba(255, 255, 255, 0.05)";
  };

  // Mouse bindings
  base.addEventListener("mousedown", (e) => {
    handleStart(e.clientX, e.clientY);
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (joysticks[side].active) {
      handleMove(e.clientX, e.clientY);
    }
  });

  window.addEventListener("mouseup", () => {
    if (joysticks[side].active) {
      handleEnd();
    }
  });

  // Touch bindings
  base.addEventListener("touchstart", (e) => {
    if (e.touches.length > 0) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
    e.preventDefault();
  });

  window.addEventListener("touchmove", (e) => {
    if (joysticks[side].active && e.touches.length > 0) {
      // Find the touch corresponding to this joystick start
      // For simplicity, just read first touch
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  });

  window.addEventListener("touchend", () => {
    if (joysticks[side].active) {
      handleEnd();
    }
  });
}

/**
 * Handle input velocities from gamepad joysticks
 */
function handleGamepadInput(vx, vy, rx, ry) {
  let finalVx = vx;
  let finalVy = vy;
  let finalVrot = rx; // Default: right stick X controls spin velocity

  const ryInverted = -ry;

  if (isHeadingLock) {
    if (Math.hypot(rx, ryInverted) > 0.2) {
      targetHeadingValue = Math.atan2(rx, ryInverted);
      hasTargetHeading = true;
    }

    if (hasTargetHeading) {
      let error = targetHeadingValue - robot.rot;
      // Normalize error to [-PI, PI]
      error = Math.atan2(Math.sin(error), Math.cos(error));
      
      const kP = 4.0;
      finalVrot = error * kP;
      finalVrot = Math.max(-1.0, Math.min(1.0, finalVrot));
      
      if (Math.abs(error) < 0.01 && Math.hypot(rx, ryInverted) <= 0.2) {
        finalVrot = 0.0;
      }
    }
  }

  // Translate vx, vy based on field-centric mode if enabled
  if (isFieldCentric) {
    const theta = robot.rot;
    // Rotate field-centric vector by theta to get robot-centric vector
    finalVx = vx * Math.cos(theta) - vy * Math.sin(theta);
    finalVy = vx * Math.sin(theta) + vy * Math.cos(theta);
  }

  // Calculate individual wheel inputs
  applyKinematicsToWheels(finalVx, finalVy, finalVrot);
}

/**
 * Main application physics translation (Kinematics)
 */
function applyKinematicsToWheels(vx, vy, vrot) {
  const dtType = DRIVETRAINS[activeDrivetrainIndex];
  
  if (dtType === "mecanum" || dtType === "omni") {
    // Standard Mecanum forward kinematic formula mapping:
    // FL = Vy + Vx + Vrot
    // FR = -Vy + Vx + Vrot
    // BL = Vy - Vx + Vrot
    // BR = -Vy - Vx + Vrot
    robot.moveWheel(0, vy + vx + vrot); // FL
    robot.moveWheel(1, -vy + vx + vrot); // FR
    robot.moveWheel(2, vy - vx + vrot); // BL
    robot.moveWheel(3, -vy - vx + vrot); // BR
  } else if (dtType === "omni3") {
    // Kiwi Drive formula mapping:
    // Wheel 0 (Back): horizontal drive
    // Wheel 1 (FR) & Wheel 2 (FL): diagonal drive
    robot.moveWheel(0, -vx + vrot); // Back
    robot.moveWheel(1, 0.5 * vx - 0.866 * vy + vrot); // FR
    robot.moveWheel(2, 0.5 * vx + 0.866 * vy + vrot); // FL
  } else if (dtType === "tank") {
    // Tank Drive mapping:
    // Left = Vy + Vrot
    // Right = -Vy + Vrot (right side inverted)
    robot.moveWheel(0, vy + vrot); // Left
    robot.moveWheel(1, -vy + vrot); // Right
  }
}

/**
 * Poll inputs from keyboard and virtual joysticks
 */
function pollKeyboardAndVirtualJoysticks() {
  // If gamepad is currently giving input, let it override
  if (gamepadHandler.isActive) {
    return;
  }

  let vx = 0.0;
  let vy = 0.0;
  let vrot = 0.0;

  // 1. Virtual Joysticks (priority over keyboard)
  if (joysticks.left.active || joysticks.right.active) {
    document.getElementById("txt-input-source").textContent = "Touch UI";
    document.getElementById("txt-input-source").className = "stat-value text-success";
    
    vx = joysticks.left.x;
    vy = joysticks.left.y;
    vrot = joysticks.right.x;
    
    if (joysticks.right.active) {
      hasTargetHeading = false; // suspend lock during manual rotation
    } else if (isHeadingLock && !hasTargetHeading) {
      targetHeadingValue = robot.rot;
      hasTargetHeading = true;
    }

    if (isHeadingLock && hasTargetHeading) {
      let error = targetHeadingValue - robot.rot;
      error = Math.atan2(Math.sin(error), Math.cos(error));
      const kP = 4.0;
      vrot = error * kP;
      vrot = Math.max(-1.0, Math.min(1.0, vrot));
      if (Math.abs(error) < 0.01) vrot = 0.0;
    }

    // Apply field-centric rotation if active
    let finalVx = vx;
    let finalVy = vy;
    if (isFieldCentric) {
      const theta = robot.rot;
      finalVx = vx * Math.cos(theta) - vy * Math.sin(theta);
      finalVy = vx * Math.sin(theta) + vy * Math.cos(theta);
    }
    
    applyKinematicsToWheels(finalVx, finalVy, vrot);
    return;
  }

  // 2. Keyboard Inputs
  document.getElementById("txt-input-source").textContent = "Keyboard";
  document.getElementById("txt-input-source").className = "stat-value text-accent";
  robot.clearInputVelocities();

  // Check individual wheel keys 1-8
  let individualWheelInput = false;
  if (activeKeys.has("1")) { robot.moveWheel(0, 1.0); individualWheelInput = true; }
  if (activeKeys.has("2")) { robot.moveWheel(0, -1.0); individualWheelInput = true; }
  if (activeKeys.has("3")) { robot.moveWheel(1, 1.0); individualWheelInput = true; }
  if (activeKeys.has("4")) { robot.moveWheel(1, -1.0); individualWheelInput = true; }
  
  if (robot.drivetrain.numWheels() === 3) {
    if (activeKeys.has("5")) { robot.moveWheel(2, 1.0); individualWheelInput = true; }
    if (activeKeys.has("6")) { robot.moveWheel(2, -1.0); individualWheelInput = true; }
  } else if (robot.drivetrain.numWheels() === 4) {
    if (activeKeys.has("5")) { robot.moveWheel(2, 1.0); individualWheelInput = true; }
    if (activeKeys.has("6")) { robot.moveWheel(2, -1.0); individualWheelInput = true; }
    if (activeKeys.has("7")) { robot.moveWheel(3, 1.0); individualWheelInput = true; }
    if (activeKeys.has("8")) { robot.moveWheel(3, -1.0); individualWheelInput = true; }
  }

  // If individual wheels are controlled, skip chassis calculation
  if (individualWheelInput) {
    return;
  }

  // Linear movement translations
  if (activeKeys.has("arrowup") || activeKeys.has("w")) {
    vy = 1.0;
  }
  if (activeKeys.has("arrowdown") || activeKeys.has("s")) {
    vy = -1.0;
  }
  if (activeKeys.has("arrowright")) {
    vx = 1.0;
  }
  if (activeKeys.has("arrowleft")) {
    vx = -1.0;
  }

  // Rotational translations
  if (activeKeys.has("d")) {
    vrot = 1.0;
    hasTargetHeading = false; // suspend lock
  }
  if (activeKeys.has("a")) {
    vrot = -1.0;
    hasTargetHeading = false; // suspend lock
  }

  if (!activeKeys.has("d") && !activeKeys.has("a")) {
    if (isHeadingLock && !hasTargetHeading) {
      targetHeadingValue = robot.rot;
      hasTargetHeading = true;
    }

    if (isHeadingLock && hasTargetHeading) {
      let error = targetHeadingValue - robot.rot;
      error = Math.atan2(Math.sin(error), Math.cos(error));
      const kP = 4.0;
      vrot = error * kP;
      vrot = Math.max(-1.0, Math.min(1.0, vrot));
      if (Math.abs(error) < 0.01) vrot = 0.0;
    }
  }

  // Apply field-centric mapping to keyboard layout
  let finalVx = vx;
  let finalVy = vy;
  if (isFieldCentric) {
    const theta = robot.rot;
    finalVx = vx * Math.cos(theta) - vy * Math.sin(theta);
    finalVy = vx * Math.sin(theta) + vy * Math.cos(theta);
  }

  applyKinematicsToWheels(finalVx, finalVy, vrot);
}

/**
 * Dynamically render progress gauges for wheel speeds
 */
function renderWheelGauges() {
  const container = document.getElementById("wheel-speeds-container");
  container.innerHTML = "";
  
  const names = robot.getTelemetry().wheelNames;
  
  names.forEach((name, idx) => {
    const gauge = document.createElement("div");
    gauge.className = "wheel-gauge";
    gauge.innerHTML = `
      <div class="wg-header">
        <span class="wg-name">${name} Speed</span>
        <span class="wg-val" id="txt-wg-val-${idx}">0.00</span>
      </div>
      <div class="wg-bar-container">
        <div class="wg-bar" id="wg-bar-${idx}" style="background-color: ${WHEEL_COLORS[idx]}"></div>
      </div>
    `;
    container.appendChild(gauge);
  });
}

function updateWheelGaugesUI(velocities) {
  velocities.forEach((val, idx) => {
    const txt = document.getElementById(`txt-wg-val-${idx}`);
    const bar = document.getElementById(`wg-bar-${idx}`);
    if (txt && bar) {
      txt.textContent = val;
      const numVal = parseFloat(val);
      // Map -1.0 to 1.0 into 0% to 50% left/right width
      const widthPercent = Math.abs(numVal) * 50;
      bar.style.width = `${widthPercent}%`;
      if (numVal >= 0) {
        bar.style.left = "50%";
      } else {
        bar.style.left = `${50 - widthPercent}%`;
      }
    }
  });
}

/**
 * Draw Grid Background on Canvas
 */
function drawGridOverlay() {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;
  
  const gridSize = 40;
  
  // If locked, calculate scrolling offsets from world coordinates
  const offsetX = lockRobotPosition ? (canvas.width / 2 - robot.x) % gridSize : 0;
  const offsetY = lockRobotPosition ? (canvas.height / 2 - robot.y) % gridSize : 0;
  
  // Vertical lines
  for (let x = offsetX; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = offsetY; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Custom Telemetry Chart rendering
 */
function updateChart(velocities) {
  // Push speeds to history
  telemetryHistory.push([...velocities]);
  if (telemetryHistory.length > maxHistoryLength) {
    telemetryHistory.shift();
  }

  // Draw chart
  const w = chartCanvas.width = chartCanvas.parentElement.clientWidth;
  const h = chartCanvas.height = chartCanvas.parentElement.clientHeight;
  
  chartCtx.clearRect(0, 0, w, h);
  
  // Draw grid lines
  chartCtx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  chartCtx.lineWidth = 1;
  // Center line (zero speed)
  chartCtx.beginPath();
  chartCtx.moveTo(0, h / 2);
  chartCtx.lineTo(w, h / 2);
  chartCtx.stroke();

  // Top and bottom limit grid lines
  chartCtx.beginPath();
  chartCtx.moveTo(0, h * 0.1);
  chartCtx.lineTo(w, h * 0.1);
  chartCtx.moveTo(0, h * 0.9);
  chartCtx.lineTo(w, h * 0.9);
  chartCtx.stroke();

  // Label axes
  chartCtx.fillStyle = "rgba(255, 255, 255, 0.3)";
  chartCtx.font = "8px 'Space Mono'";
  chartCtx.fillText("+1.0", 8, h * 0.15);
  chartCtx.fillText("0.0", 8, h / 2 - 3);
  chartCtx.fillText("-1.0", 8, h * 0.88);

  // Plot traces
  if (telemetryHistory.length < 2) return;
  
  const numTraces = velocities.length;
  const dx = w / maxHistoryLength;
  
  for (let wheelIdx = 0; wheelIdx < numTraces; wheelIdx++) {
    chartCtx.strokeStyle = WHEEL_COLORS[wheelIdx];
    chartCtx.lineWidth = 2;
    chartCtx.beginPath();
    
    for (let i = 0; i < telemetryHistory.length; i++) {
      const val = parseFloat(telemetryHistory[i][wheelIdx]);
      // map val -1.2 to 1.2 to canvas height h * 0.9 to h * 0.1
      const y = h / 2 - (val * (h * 0.4));
      const x = i * dx + (w - telemetryHistory.length * dx);
      
      if (i === 0) {
        chartCtx.moveTo(x, y);
      } else {
        chartCtx.lineTo(x, y);
      }
    }
    chartCtx.stroke();
  }

  // Update Legend badge based on active drivetrain
  const legend = document.getElementById("chart-legend");
  let legendHTML = "";
  if (velocities.length === 4) {
    legendHTML = `<span style="color:${WHEEL_COLORS[0]}">■ FL</span> <span style="color:${WHEEL_COLORS[1]}">■ FR</span> <span style="color:${WHEEL_COLORS[2]}">■ BL</span> <span style="color:${WHEEL_COLORS[3]}">■ BR</span>`;
  } else if (velocities.length === 3) {
    legendHTML = `<span style="color:${WHEEL_COLORS[0]}">■ Back</span> <span style="color:${WHEEL_COLORS[1]}">■ FR</span> <span style="color:${WHEEL_COLORS[2]}">■ FL</span>`;
  } else {
    legendHTML = `<span style="color:${WHEEL_COLORS[0]}">■ Left</span> <span style="color:${WHEEL_COLORS[1]}">■ Right</span>`;
  }
  legend.innerHTML = legendHTML;
}

/**
 * Core Application Loop (60FPS requestAnimationFrame)
 */
function loop(now) {
  let dt = (now - lastTime) / 1000.0;
  // Cap dt to prevent massive jumps when switching tabs
  if (dt > 0.1) dt = 0.1;
  lastTime = now;

  // Poll Inputs
  gamepadHandler.update();
  pollKeyboardAndVirtualJoysticks();

  // Update Physics
  robot.update(dt, speedMultiplier, rotSpeedMultiplier);

  // Keep robot inside canvas boundaries (only when NOT locked to center)
  if (!lockRobotPosition) {
    const margin = 80;
    if (robot.x < margin) robot.x = margin;
    if (robot.x > canvas.width - margin) robot.x = canvas.width - margin;
    if (robot.y < margin) robot.y = margin;
    if (robot.y > canvas.height - margin) robot.y = canvas.height - margin;
  }

  // Render Simulation
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (showGrid) {
    drawGridOverlay();
  }
  
  robot.draw(ctx, showVectors, showTrail, lockRobotPosition, canvas.width, canvas.height);

  // Update Telemetry Displays
  const tel = robot.getTelemetry();
  document.getElementById("txt-position").textContent = `X: ${tel.x}, Y: ${tel.y}`;
  document.getElementById("txt-heading").textContent = `${tel.rot}°`;
  
  updateWheelGaugesUI(tel.wheelVelocities);
  updateChart(tel.wheelVelocities);

  // Continue Loop
  requestAnimationFrame(loop);
}
