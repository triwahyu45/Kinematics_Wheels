/**
 * Gamepad API Handler and UI Debugger
 */
class GamepadHandler {
  constructor(onInputCallback) {
    this.onInput = onInputCallback;
    this.connectedGamepadIndex = null;
    this.deadzone = 0.15; // standard joystick deadzone to prevent drifting
    this.isActive = false;

    // UI elements
    this.indicator = document.getElementById("gamepad-status-indicator");
    this.infoText = document.getElementById("gamepad-info-text");
    this.vizContainer = document.getElementById("controller-viz");
    this.lStickDot = document.getElementById("gamepad-lstick-dot");
    this.rStickDot = document.getElementById("gamepad-rstick-dot");
    this.lStickVal = document.getElementById("txt-lstick-val");
    this.rStickVal = document.getElementById("txt-rstick-val");
    this.buttonsViz = document.getElementById("gamepad-buttons-viz");
    this.inputSourceBadge = document.getElementById("txt-input-source");

    this.buttonsState = [];

    // Bind events
    window.addEventListener("gamepadconnected", (e) => this.handleConnect(e));
    window.addEventListener("gamepaddisconnected", (e) => this.handleDisconnect(e));
  }

  handleConnect(event) {
    console.log(`Gamepad connected at index ${event.gamepad.index}: ${event.gamepad.id}. ${event.gamepad.buttons.length} buttons, ${event.gamepad.axes.length} axes.`);
    
    // Choose the first connected gamepad
    if (this.connectedGamepadIndex === null) {
      this.connectedGamepadIndex = event.gamepad.index;
      this.setupUI(event.gamepad);
    }
  }

  handleDisconnect(event) {
    console.log(`Gamepad disconnected from index ${event.gamepad.index}`);
    if (this.connectedGamepadIndex === event.gamepad.index) {
      this.connectedGamepadIndex = null;
      this.teardownUI();
    }
  }

  setupUI(gamepad) {
    this.indicator.className = "status-indicator connected";
    this.infoText.innerHTML = `<strong>Connected:</strong><br>${gamepad.id.split(" (")[0]}`;
    this.vizContainer.style.display = "flex";
    this.inputSourceBadge.textContent = "Gamepad";
    this.inputSourceBadge.className = "stat-value text-success";

    // Setup buttons in visualizer
    this.buttonsViz.innerHTML = "";
    this.buttonsState = new Array(gamepad.buttons.length).fill(false);
    
    // Label buttons nicely (A, B, X, Y or numbers)
    for (let i = 0; i < gamepad.buttons.length; i++) {
      const btn = document.createElement("div");
      btn.className = "btn-viz";
      btn.id = `btn-viz-${i}`;
      
      let label = `B${i}`;
      // Standard Xbox mappings
      if (i === 0) label = "A";
      else if (i === 1) label = "B";
      else if (i === 2) label = "X";
      else if (i === 3) label = "Y";
      else if (i === 4) label = "LB";
      else if (i === 5) label = "RB";
      else if (i === 6) label = "LT";
      else if (i === 7) label = "RT";
      else if (i === 8) label = "Back";
      else if (i === 9) label = "Start";
      else if (i === 10) label = "LS";
      else if (i === 11) label = "RS";
      else if (i === 12) label = "D-Up";
      else if (i === 13) label = "D-Dn";
      else if (i === 14) label = "D-Lf";
      else if (i === 15) label = "D-Rt";

      btn.textContent = label;
      this.buttonsViz.appendChild(btn);
    }
  }

  teardownUI() {
    this.indicator.className = "status-indicator disconnected";
    this.infoText.textContent = "No gamepad connected. Connect a controller and press any button.";
    this.vizContainer.style.display = "none";
    this.inputSourceBadge.textContent = "Keyboard";
    this.inputSourceBadge.className = "stat-value text-accent";
    this.isActive = false;
  }

  // Filter input value based on deadzone
  applyDeadzone(value) {
    if (Math.abs(value) < this.deadzone) {
      return 0.0;
    }
    // Scale remaining values from 0.0 to 1.0
    const sign = Math.sign(value);
    const absVal = Math.abs(value);
    return sign * ((absVal - this.deadzone) / (1.0 - this.deadzone));
  }

  /**
   * Poll Gamepad state and invoke callback
   * Should be called inside the main requestAnimationFrame loop.
   */
  update() {
    if (this.connectedGamepadIndex === null) {
      this.isActive = false;
      return;
    }

    // Get fresh gamepad state
    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.connectedGamepadIndex];

    if (!gp) {
      this.isActive = false;
      return;
    }

    // Read axes values
    // Axis 0 = Left Stick X (Right/Left)
    // Axis 1 = Left Stick Y (Down/Up)
    // Axis 2 = Right Stick X (Rotate Right/Left) - Standard Gamepad mapping
    // Axis 3 = Right Stick Y (not used)
    let lx = this.applyDeadzone(gp.axes[0]);
    let ly = this.applyDeadzone(gp.axes[1]);
    let rx = this.applyDeadzone(gp.axes[2]);
    let ry = gp.axes[3] ? this.applyDeadzone(gp.axes[3]) : 0;

    // Check if right stick X uses Axis 3 (fallback on some browser mappings)
    // On some older controllers or non-standard mappings, Right Stick X is Axis 3
    if (gp.axes.length > 3 && Math.abs(rx) < 0.01 && Math.abs(this.applyDeadzone(gp.axes[3])) > 0.01) {
      // In some configurations RS X and Y are flipped
      // If we don't detect standard axis, let's keep it safe
    }

    // Invert Y axes for robot conventions (pushing stick forward should mean positive Y forward speed)
    ly = -ly;

    // Determine if gamepad is actively inputting
    const hasStickInput = (Math.abs(lx) > 0.01 || Math.abs(ly) > 0.01 || Math.abs(rx) > 0.01);
    
    // Update visualizer dots (80px box, half is 40px, dot is 8px, max translation offset is 36px)
    const maxOffset = 36;
    this.lStickDot.style.transform = `translate(${gp.axes[0] * maxOffset}px, ${gp.axes[1] * maxOffset}px)`;
    this.rStickDot.style.transform = `translate(${gp.axes[2] * maxOffset}px, ${gp.axes[3] * maxOffset}px)`;
    
    this.lStickVal.textContent = `X: ${gp.axes[0].toFixed(2)}, Y: ${(-gp.axes[1]).toFixed(2)}`;
    this.rStickVal.textContent = `X: ${gp.axes[2].toFixed(2)}, Y: ${(-gp.axes[3]).toFixed(2)}`;

    // Update buttons in Visualizer & detect triggers
    let buttonPressed = false;
    for (let i = 0; i < gp.buttons.length; i++) {
      const btnState = gp.buttons[i];
      const isPressed = btnState.pressed;
      const wasPressed = this.buttonsState[i];

      const btnEl = document.getElementById(`btn-viz-${i}`);
      if (btnEl) {
        if (isPressed) {
          btnEl.classList.add("active");
          buttonPressed = true;
        } else {
          btnEl.classList.remove("active");
        }
      }

      // Action triggers on button press down (rising edge)
      if (isPressed && !wasPressed) {
        this.handleButtonPress(i);
      }

      this.buttonsState[i] = isPressed;
    }

    // Set active status
    this.isActive = hasStickInput || buttonPressed;

    if (hasStickInput) {
      this.inputSourceBadge.textContent = "Gamepad";
      this.inputSourceBadge.className = "stat-value text-success";
      // Send joysticks input back to app: lx (strafe), ly (forward), rx (turn X), ry (turn Y)
      this.onInput(lx, ly, rx, ry);
    }
  }

  // Trigger app actions on specific button clicks
  handleButtonPress(buttonIndex) {
    // Maps standard Xbox button indices
    switch(buttonIndex) {
      case 0: // 'A' button - Reset Robot Position
        console.log("Gamepad: Triggering Robot Reset");
        window.dispatchEvent(new CustomEvent("robot-reset"));
        break;
      case 1: // 'B' button - Toggle Field Centric Mode
        console.log("Gamepad: Toggling Field-Centric Mode");
        window.dispatchEvent(new CustomEvent("toggle-fc"));
        break;
      case 2: // 'X' button - Clear Trail
        console.log("Gamepad: Clearing Trail");
        window.dispatchEvent(new CustomEvent("clear-trail"));
        break;
      case 3: // 'Y' button - Toggle Force Vectors
        console.log("Gamepad: Toggling Vectors");
        window.dispatchEvent(new CustomEvent("toggle-vectors"));
        break;
      case 4: // 'LB' - Cycle drivetrain backward
        console.log("Gamepad: Previous Drivetrain");
        window.dispatchEvent(new CustomEvent("dt-prev"));
        break;
      case 5: // 'RB' - Cycle drivetrain forward
        console.log("Gamepad: Next Drivetrain");
        window.dispatchEvent(new CustomEvent("dt-next"));
        break;
      case 6: // 'LT' - Toggle Path Trail
        console.log("Gamepad: Toggling Trail");
        window.dispatchEvent(new CustomEvent("toggle-trail"));
        break;
      case 7: // 'RT' - Toggle Force Vectors (Alternative)
        console.log("Gamepad: Toggling Vectors (RT)");
        window.dispatchEvent(new CustomEvent("toggle-vectors"));
        break;
      case 8: // 'Select/Back' - Toggle Lock Robot Position
        console.log("Gamepad: Toggling Lock Position");
        window.dispatchEvent(new CustomEvent("toggle-lock"));
        break;
      case 9: // 'Start' - Toggle Grid Lines
        console.log("Gamepad: Toggling Grid");
        window.dispatchEvent(new CustomEvent("toggle-grid"));
        break;
      case 12: // D-pad Up - Speed Up
        console.log("Gamepad: Speed Up");
        window.dispatchEvent(new CustomEvent("speed-up"));
        break;
      case 13: // D-pad Down - Speed Down
        console.log("Gamepad: Speed Down");
        window.dispatchEvent(new CustomEvent("speed-down"));
        break;
      case 14: // D-pad Left - Rotation Speed Down
        console.log("Gamepad: Rotation Speed Down");
        window.dispatchEvent(new CustomEvent("rot-down"));
        break;
      case 15: // D-pad Right - Rotation Speed Up
        console.log("Gamepad: Rotation Speed Up");
        window.dispatchEvent(new CustomEvent("rot-up"));
        break;
      case 11: // 'RS Click / R3' - Toggle Heading Lock
        console.log("Gamepad: Toggling Heading Lock");
        window.dispatchEvent(new CustomEvent("toggle-heading-lock"));
        break;
    }
  }
}
