# KineDrive: Robotics Kinematics Wheels Simulator

An interactive, high-performance, and visually rich web simulator for exploring 2D robot kinematics across various drivetrain systems, built using HTML5 Canvas, CSS3, and Vanilla JavaScript.

🚀 **[Try the Live Web Simulation here!](https://triwahyu45.github.io/Kinematics_Wheels/)**

---

## 🌟 Key Features

*   **Three Drivetrain Systems**:
    *   **Mecanum Drive (4-Wheel)**: Multi-directional translation and rotation mapping with diagonal roller vector force drawing.
    *   **Omni Wheel Drive (4-Wheel)**: 45-degree rotated corner wheel kinematics, demonstrating roller slide and traction vectors.
    *   **Tank Drive (2-Wheel)**: Differential-steering traction treads simulating tank tread cleats and sprocket rotations.
*   **HTML5 Gamepad API Support**: Play natively using any standard USB or Bluetooth gamepad (Xbox, PlayStation, or generic controller).
*   **Real-time Gamepad Diagnostics**: Visualizer panel showing active stick deflection coordinates and button press states.
*   **Advanced Control Modes**:
    *   **Robot-Centric**: Robot moves relative to its own chassis heading.
    *   **Field-Centric**: Robot moves relative to your viewport screen (standard FRC/FTC competitive programming feature).
*   **Oscilloscope Telemetry Chart**: Real-time rolling graph illustrating individual wheel/motor velocity curves over time.
*   **Touchscreen Compatibility**: Dual virtual touch joysticks for mobile screens and touch UI devices.
*   **Interactive Frame Dragging**: Re-position the robot chassis manually by clicking and dragging it on the grid arena.

---

## 🎮 Controls & Keymaps

### Keyboard Layout
| Key | Action |
| --- | --- |
| **W / S** or **Arrow Up / Down** | Maju / Mundur (Translation) |
| **Arrow Left / Right** | Geser Kiri / Kanan (*Strafe* Translation - Mecanum/Omni) |
| **A / D** | Putar Kiri / Kanan (Rotation / Turning) |
| **1 - 8** | Putar motor individu (1/2: FL, 3/4: FR, 5/6: BL, 7/8: BR) |
| **M** | Ubah ke **Mecanum Drive** |
| **O** | Ubah ke **Omni-wheel Drive** |
| **T** | Ubah ke **Tank Drive** |
| **R** | Reset Posisi ke Tengah |

### Gamepad Configuration (Xbox / PlayStation Mapping)
*   **Left Analog Stick**: Linear movement (Forward, Backward, Strafe Left & Right).
*   **Right Analog Stick**: Rotation (Turn Left / Right).
*   **Button A (Xbox) / × (PS)**: Reset position to center.
*   **Button B (Xbox) / ○ (PS)**: Toggle **Field-Centric** mode.
*   **Button X (Xbox) / □ (PS)**: Clear trajectory history (*Clear Trail*).
*   **Button Y (Xbox) / △ (PS)**: Show/Hide force vector arrows.
*   **Bumpers (LB / RB)**: Cycle drivetrains (Mecanum ➔ Omni ➔ Tank).

---

## 🔬 Mathematical Modeling

### Mecanum & Omni Kinematics
For inputs $V_x$ (lateral speed), $V_y$ (longitudinal speed), and $V_{rot}$ (rotational speed), individual wheel speed outputs are calculated as:

$$\text{Front Left (FL)} = V_y + V_x + V_{rot}$$
$$\text{Front Right (FR)} = -V_y + V_x + V_{rot}$$
$$\text{Back Left (BL)} = V_y - V_x + V_{rot}$$
$$\text{Back Right (BR)} = -V_y - V_x + V_{rot}$$

### Tank Drive Kinematics
For a standard differential drive:

$$\text{Left Motor} = V_y + V_{rot}$$
$$\text{Right Motor} = -V_y + V_{rot}$$

---

## 🛠️ Local Development & Running

1. **Install Node.js** (if not already installed).
2. Clone this repository to your local directory.
3. Open a terminal in the root directory and install dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Vite will open the application in your default browser at `http://localhost:5173`.

---

## 📂 Project Structure

*   `index.html` - Sidebar parameters, dashboard UI, and simulation canvas.
*   `style.css` - UI layout styles, grid styles, and active status indicators.
*   `robot.js` - Kinematic equations, wheel spins, and force vector drawings.
*   `gamepad.js` - Gamepad API controller event listeners and visual debugger.
*   `app.js` - Keyboard listener routing, virtual joysticks, and rendering loops.

---

## 📜 License

This project is licensed under the MIT License - feel free to use, modify, and distribute it for academic or personal robotics research.
