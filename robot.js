// Robot Dimension Constants
const ROBOT_WIDTH = 130.0;
const ROBOT_HEIGHT = 130.0;
const ROBOT_BASE_HEIGHT_MARGIN = 44.0;

// Wheel Dimension Constants
const MECANUM_WHEEL_WIDTH = 24.0;
const MECANUM_WHEEL_HEIGHT = 64.0;
const MECANUM_ROLLER_SPACING = 18.0;
const MECANUM_ARROW_LENGTH = 50.0;

const TANK_TREAD_WIDTH = 24.0;
const TANK_TREAD_HEIGHT = 170.0;
const TANK_LINE_SPACING = 18.0;

const FORCE_ARROW_LENGTH = 40.0;
const TORQUE_ARROW_SCALE = 20.0;

/**
 * Base Drivetrain Class
 */
class Drivetrain {
  constructor(name, numWheels) {
    this.name = name;
    this.wheelsCount = numWheels;
  }

  getDriveTrainName() {
    return this.name;
  }

  numWheels() {
    return this.wheelsCount;
  }

  // Abstract methods to be overridden
  forwardWheelSpins() { return []; }
  rightWheelSpins() { return []; }
  turnRightWheelSpins() { return []; }
  getRobotTranslation(velocities) { return { x: 0, y: 0 }; }
  getRobotRotation(velocities) { return 0; }
  drawWheels(ctx, wheelSpins, velocities) {}
}

/**
 * Mecanum and Omni Drivetrain
 */
class MecanumDriveTrain extends Drivetrain {
  constructor(isOmni = false) {
    super(isOmni ? "Omni-wheel Drive" : "Mecanum Drive", 4);
    this.isOmni = isOmni;
    
    // Wheel directions mapping
    // Index: 0 = Front Left (FL), 1 = Front Right (FR), 2 = Back Left (BL), 3 = Back Right (BR)
    this.forward = [1.0, -1.0, 1.0, -1.0];
    this.right = [1.0, 1.0, -1.0, -1.0];
    this.turnRight = [1.0, 1.0, 1.0, 1.0];
    
    this.wheelRotation = isOmni ? -Math.PI / 4 : 0.0;
  }

  setOmniWheelMode(omni) {
    this.isOmni = omni;
    this.name = omni ? "Omni-wheel Drive" : "Mecanum Drive";
  }

  forwardWheelSpins() {
    return this.forward;
  }

  rightWheelSpins() {
    return this.right;
  }

  turnRightWheelSpins() {
    return this.turnRight;
  }

  // Calculate robot velocities based on wheel speeds
  getRobotTranslation(velocities) {
    // velocities: FL, FR, BL, BR
    const forwardMovement = (velocities[0] + velocities[2] - velocities[1] - velocities[3]) / Math.sqrt(2.0);
    const rightMovement = (velocities[0] + velocities[1] - velocities[2] - velocities[3]) / Math.sqrt(2.0);
    
    // Y points upwards in robot coordinates, on-screen Y points down, so we flip forward
    return { x: rightMovement, y: -forwardMovement };
  }

  getRobotRotation(velocities) {
    return (velocities[0] + velocities[2] + velocities[1] + velocities[3]) * 0.006;
  }

  updateWheelAngle(dt) {
    const targetAngle = this.isOmni ? -Math.PI / 4 : 0.0;
    // Smooth transition between Mecanum (0 deg) and Omni (-45 deg)
    this.wheelRotation += (targetAngle - this.wheelRotation) * 0.1;
  }

  drawWheels(ctx, wheelSpins, velocities) {
    // Front Left (0)
    ctx.save();
    ctx.translate(-ROBOT_WIDTH / 2, -ROBOT_HEIGHT / 2);
    ctx.scale(1, -1);
    this.drawSingleWheel(ctx, -wheelSpins[0], -velocities[0]);
    ctx.restore();

    // Front Right (1)
    ctx.save();
    ctx.translate(ROBOT_WIDTH / 2, -ROBOT_HEIGHT / 2);
    this.drawSingleWheel(ctx, -wheelSpins[1], -velocities[1]);
    ctx.restore();

    // Back Left (2)
    ctx.save();
    ctx.translate(-ROBOT_WIDTH / 2, ROBOT_HEIGHT / 2);
    this.drawSingleWheel(ctx, wheelSpins[2], velocities[2]);
    ctx.restore();

    // Back Right (3)
    ctx.save();
    ctx.translate(ROBOT_WIDTH / 2, ROBOT_HEIGHT / 2);
    ctx.scale(1, -1);
    this.drawSingleWheel(ctx, wheelSpins[3], velocities[3]);
    ctx.restore();
  }

  drawSingleWheel(ctx, spin, velocity) {
    ctx.save();
    ctx.rotate(this.wheelRotation);

    // Keep spin positive to simplify modulo calculations
    let positiveSpin = spin;
    if (positiveSpin < 0) {
      positiveSpin += MECANUM_ROLLER_SPACING * Math.ceil(-positiveSpin / MECANUM_ROLLER_SPACING);
    }

    if (this.isOmni) {
      this.drawOmniWheelGraphics(ctx, positiveSpin, velocity);
    } else {
      this.drawMecanumWheelGraphics(ctx, positiveSpin, velocity);
    }

    ctx.restore();
  }

  drawMecanumWheelGraphics(ctx, spin, velocity) {
    // 1. Force Vector Arrow Outline (Grey)
    ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-MECANUM_ARROW_LENGTH, -MECANUM_ARROW_LENGTH);
    ctx.lineTo(MECANUM_ARROW_LENGTH, MECANUM_ARROW_LENGTH);
    ctx.stroke();

    // 2. Actual Roller Force Vector (Neon Red)
    if (Math.abs(velocity) > 0.01) {
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#ef4444";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      
      const fx = -velocity * MECANUM_ARROW_LENGTH;
      const fy = -velocity * MECANUM_ARROW_LENGTH;
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(fx, fy);
      ctx.stroke();

      // Arrowhead
      const offset = velocity > 0 ? 12 : -12;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, fy + offset);
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + offset, fy);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw Tire Body (Futuristic metallic look)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#1e293b"; // dark slate body
    ctx.beginPath();
    ctx.roundRect(-MECANUM_WHEEL_WIDTH / 2, -MECANUM_WHEEL_HEIGHT / 2, MECANUM_WHEEL_WIDTH, MECANUM_WHEEL_HEIGHT, 4);
    ctx.fill();
    ctx.stroke();

    // Wheel hubs/rims
    ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
    ctx.fillRect(-MECANUM_WHEEL_WIDTH / 4, -MECANUM_WHEEL_HEIGHT / 3, MECANUM_WHEEL_WIDTH / 2, (MECANUM_WHEEL_HEIGHT * 2) / 3);

    // 4. Roller Lines (Clipping simulation)
    ctx.save();
    // Clip drawing to wheel bounds
    ctx.beginPath();
    ctx.roundRect(-MECANUM_WHEEL_WIDTH / 2, -MECANUM_WHEEL_HEIGHT / 2, MECANUM_WHEEL_WIDTH, MECANUM_WHEEL_HEIGHT, 4);
    ctx.clip();

    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 2.5;

    let diagY = -MECANUM_WHEEL_HEIGHT / 2 - (spin % MECANUM_ROLLER_SPACING) + MECANUM_ROLLER_SPACING;
    while (diagY < MECANUM_WHEEL_HEIGHT / 2 + MECANUM_WHEEL_WIDTH) {
      let diagEndOffset = 0;
      if (diagY > MECANUM_WHEEL_HEIGHT / 2) {
        diagEndOffset = diagY - MECANUM_WHEEL_HEIGHT / 2;
      }
      let diagStartOffset = 0;
      if (diagY - MECANUM_WHEEL_WIDTH < -MECANUM_WHEEL_HEIGHT / 2) {
        diagStartOffset = diagY - MECANUM_WHEEL_WIDTH + MECANUM_WHEEL_HEIGHT / 2;
      }

      ctx.beginPath();
      ctx.moveTo(-MECANUM_WHEEL_WIDTH / 2 + diagEndOffset, diagY - diagEndOffset);
      ctx.lineTo(MECANUM_WHEEL_WIDTH / 2 + diagStartOffset, diagY - MECANUM_WHEEL_WIDTH - diagStartOffset);
      ctx.stroke();

      diagY += MECANUM_ROLLER_SPACING;
    }
    ctx.restore(); // Restore context to remove clipping
  }

  drawOmniWheelGraphics(ctx, spin, velocity) {
    // 1. Force Vector Guide Line (Grey, extending outside the wheel body)
    ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -MECANUM_ARROW_LENGTH - 15);
    ctx.lineTo(0, MECANUM_ARROW_LENGTH + 15);
    ctx.stroke();

    // 2. Draw Force Vector Arrow (Red)
    if (Math.abs(velocity) > 0.01) {
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#ef4444";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      
      // Make the red arrow slightly longer so it's clearly visible outside the wheel body
      const fy = -velocity * (MECANUM_ARROW_LENGTH + 10);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, fy);
      ctx.stroke();

      // Arrowhead pointing along local Y
      const offset = velocity > 0 ? 10 : -10;
      ctx.beginPath();
      ctx.moveTo(0, fy);
      ctx.lineTo(-6, fy + offset);
      ctx.moveTo(0, fy);
      ctx.lineTo(6, fy + offset);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Tire Body
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(-MECANUM_WHEEL_WIDTH / 2, -MECANUM_WHEEL_HEIGHT / 2, MECANUM_WHEEL_WIDTH, MECANUM_WHEEL_HEIGHT, 4);
    ctx.fill();
    ctx.stroke();

    // Wheel hub
    ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
    ctx.fillRect(-MECANUM_WHEEL_WIDTH / 4, -MECANUM_WHEEL_HEIGHT / 3, MECANUM_WHEEL_WIDTH / 2, (MECANUM_WHEEL_HEIGHT * 2) / 3);

    // 3. Omni circumferential roller lines (drawn perpendicular to tire length)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-MECANUM_WHEEL_WIDTH / 2, -MECANUM_WHEEL_HEIGHT / 2, MECANUM_WHEEL_WIDTH, MECANUM_WHEEL_HEIGHT, 4);
    ctx.clip();

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 3;

    let lineY = -MECANUM_WHEEL_HEIGHT / 2 - (spin % MECANUM_ROLLER_SPACING) + MECANUM_ROLLER_SPACING;
    while (lineY < MECANUM_WHEEL_HEIGHT / 2) {
      ctx.beginPath();
      ctx.moveTo(-MECANUM_WHEEL_WIDTH / 2, lineY);
      ctx.lineTo(MECANUM_WHEEL_WIDTH / 2, lineY);
      ctx.stroke();

      lineY += MECANUM_ROLLER_SPACING;
    }
    ctx.restore();
  }
}

/**
 * Tank Drive (2 Treads)
 */
class TankDriveTrain extends Drivetrain {
  constructor() {
    super("Tank Drive", 2);
    this.forward = [1.0, -1.0];
    this.turnRight = [1.0, 1.0];
  }

  forwardWheelSpins() {
    return this.forward;
  }

  rightWheelSpins() {
    // Tank drives cannot strafe, so left/right inputs just rotate them
    return this.turnRight;
  }

  turnRightWheelSpins() {
    return this.turnRight;
  }

  getRobotTranslation(velocities) {
    // velocities: Left, Right
    // Speed is proportional to the difference (left spins forward, right spins backward)
    const forwardMovement = (velocities[0] - velocities[1]) * 2.0;
    return { x: 0.0, y: -forwardMovement };
  }

  getRobotRotation(velocities) {
    return (velocities[0] + velocities[1]) * 0.012;
  }

  updateWheelAngle(dt) {
    // Tank drive has no wheel rotation transitions
  }

  drawWheels(ctx, wheelSpins, velocities) {
    // Left tread
    ctx.save();
    ctx.translate(-ROBOT_WIDTH / 2, 0.0);
    ctx.scale(1, -1);
    this.drawTankTread(ctx, -wheelSpins[0]);
    ctx.restore();

    // Right tread
    ctx.save();
    ctx.translate(ROBOT_WIDTH / 2, 0.0);
    this.drawTankTread(ctx, -wheelSpins[1]);
    ctx.restore();
  }

  drawTankTread(ctx, spin) {
    let positiveSpin = spin;
    if (positiveSpin < 0) {
      positiveSpin += TANK_LINE_SPACING * Math.ceil(-positiveSpin / TANK_LINE_SPACING);
    }

    // 1. Tread Body (Thick robust rubber texture)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "#0f172a"; // extra dark tread
    ctx.beginPath();
    ctx.roundRect(-TANK_TREAD_WIDTH / 2, -TANK_TREAD_HEIGHT / 2, TANK_TREAD_WIDTH, TANK_TREAD_HEIGHT, 8);
    ctx.fill();
    ctx.stroke();

    // Inner sprocket wheels visualization
    ctx.fillStyle = "rgba(71, 85, 105, 0.6)";
    ctx.beginPath();
    ctx.arc(0, -TANK_TREAD_HEIGHT / 2.5, TANK_TREAD_WIDTH * 0.4, 0, Math.PI * 2);
    ctx.arc(0, TANK_TREAD_HEIGHT / 2.5, TANK_TREAD_WIDTH * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 2. Tread Cleats/Lines
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-TANK_TREAD_WIDTH / 2, -TANK_TREAD_HEIGHT / 2, TANK_TREAD_WIDTH, TANK_TREAD_HEIGHT, 8);
    ctx.clip();

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 4;

    let lineY = -TANK_TREAD_HEIGHT / 2 - (positiveSpin % TANK_LINE_SPACING) + TANK_LINE_SPACING;
    while (lineY < TANK_TREAD_HEIGHT / 2) {
      ctx.beginPath();
      ctx.moveTo(-TANK_TREAD_WIDTH / 2, lineY);
      ctx.lineTo(TANK_TREAD_WIDTH / 2, lineY);
      ctx.stroke();

      lineY += TANK_LINE_SPACING;
    }
    ctx.restore();
  }
}

/**
 * 3-Wheel Omni Drive (Kiwi holonomic configuration)
 */
class Omni3DriveTrain extends Drivetrain {
  constructor() {
    super("3-Wheel Omni Drive", 3);
    // Vector contributions:
    // Wheel 0 (Front): Horizontal sideways drive
    // Wheel 1 (BR) & Wheel 2 (BL): Angled vectors at 120-degree intervals
    this.forward = [0.0, -Math.sqrt(3.0) / 2.0, Math.sqrt(3.0) / 2.0];
    this.right = [1.0, -0.5, -0.5];
    this.turnRight = [1.0, 1.0, 1.0];
  }

  forwardWheelSpins() {
    return this.forward;
  }

  rightWheelSpins() {
    return this.right;
  }

  turnRightWheelSpins() {
    return this.turnRight;
  }

  getRobotTranslation(velocities) {
    // Kinematic translation conversion from wheel velocities:
    // vx = v1 - v2
    // vy = (2*v0 - 3*v1 + v2) / sqrt(3)
    const vx = velocities[1] - velocities[2];
    const vy = (2.0 * velocities[0] - 3.0 * velocities[1] + velocities[2]) / Math.sqrt(3.0);
    return { x: vx, y: -vy };
  }

  getRobotRotation(velocities) {
    // Analytical rotation calculation: Vrot = v0 - Vx = v0 - v1 + v2
    return (velocities[0] - velocities[1] + velocities[2]) * 0.008;
  }

  updateWheelAngle(dt) {
    // Omni wheels are fixed at 120 degrees relative to each other
  }

  drawWheels(ctx, wheelSpins, velocities) {
    const R = ROBOT_HEIGHT * 0.7; // distance from center to wheels

    // Wheel 0: Front Apex (0, -R)
    ctx.save();
    ctx.translate(0, -R);
    ctx.rotate(-Math.PI / 2.0); // Oriented horizontally, local positive Y points right
    this.drawSingleWheel(ctx, wheelSpins[0], velocities[0]);
    ctx.restore();

    // Wheel 1: Bottom Right (R * cos(30°), R * sin(30°))
    ctx.save();
    ctx.translate(R * Math.cos(Math.PI / 6.0), R * Math.sin(Math.PI / 6.0));
    ctx.rotate(-Math.PI / 6.0); // Perpendicular to radius, local positive Y points down-right
    this.drawSingleWheel(ctx, wheelSpins[1], velocities[1]);
    ctx.restore();

    // Wheel 2: Bottom Left (-R * cos(30°), R * sin(30°))
    ctx.save();
    ctx.translate(-R * Math.cos(Math.PI / 6.0), R * Math.sin(Math.PI / 6.0));
    ctx.rotate(Math.PI / 6.0); // Perpendicular to radius, local positive Y points down-left
    this.drawSingleWheel(ctx, wheelSpins[2], velocities[2]);
    ctx.restore();
  }

  drawSingleWheel(ctx, spin, velocity) {
    let positiveSpin = spin;
    if (positiveSpin < 0) {
      positiveSpin += MECANUM_ROLLER_SPACING * Math.ceil(-positiveSpin / MECANUM_ROLLER_SPACING);
    }

    // 1. Force Vector Guide Line (Grey, extending outside the wheel body)
    ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -MECANUM_ARROW_LENGTH - 15);
    ctx.lineTo(0, MECANUM_ARROW_LENGTH + 15);
    ctx.stroke();

    // 2. Draw Force Vector Arrow (Red)
    if (Math.abs(velocity) > 0.01) {
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#ef4444";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      
      // Draw arrow in the direction of local positive Y (so no negation here)
      const fy = velocity * (MECANUM_ARROW_LENGTH + 10);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, fy);
      ctx.stroke();

      // Arrowhead
      const offset = velocity > 0 ? -10 : 10;
      ctx.beginPath();
      ctx.moveTo(0, fy);
      ctx.lineTo(-6, fy + offset);
      ctx.moveTo(0, fy);
      ctx.lineTo(6, fy + offset);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw Tire Body
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(-MECANUM_WHEEL_WIDTH / 2, -MECANUM_WHEEL_HEIGHT / 2, MECANUM_WHEEL_WIDTH, MECANUM_WHEEL_HEIGHT, 4);
    ctx.fill();
    ctx.stroke();

    // Wheel hub
    ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
    ctx.fillRect(-MECANUM_WHEEL_WIDTH / 4, -MECANUM_WHEEL_HEIGHT / 3, MECANUM_WHEEL_WIDTH / 2, (MECANUM_WHEEL_HEIGHT * 2) / 3);

    // 4. Omni circumferential roller lines (drawn perpendicular to tire length)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-MECANUM_WHEEL_WIDTH / 2, -MECANUM_WHEEL_HEIGHT / 2, MECANUM_WHEEL_WIDTH, MECANUM_WHEEL_HEIGHT, 4);
    ctx.clip();

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 3;

    let lineY = -MECANUM_WHEEL_HEIGHT / 2 - (positiveSpin % MECANUM_ROLLER_SPACING) + MECANUM_ROLLER_SPACING;
    while (lineY < MECANUM_WHEEL_HEIGHT / 2) {
      ctx.beginPath();
      ctx.moveTo(-MECANUM_WHEEL_WIDTH / 2, lineY);
      ctx.lineTo(MECANUM_WHEEL_WIDTH / 2, lineY);
      ctx.stroke();

      lineY += MECANUM_ROLLER_SPACING;
    }
    ctx.restore();
  }
}

/**
 * Main Robot class governing coordinates, heading, trails, and force updates.
 */
class Robot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.rot = 0; // rotation angle in radians

    this.drivetrain = new MecanumDriveTrain(false); // Default: Mecanum
    
    // Arrays representing states
    this.wheelVelocities = new Array(this.drivetrain.numWheels()).fill(0.0);
    this.inputVelocities = new Array(this.drivetrain.numWheels()).fill(0.0);
    this.wheelSpins = new Array(this.drivetrain.numWheels()).fill(0.0);

    // Trail coordinates
    this.trail = [];
    this.maxTrailSize = 300;
  }

  setDrivetrain(drivetrainType) {
    if (drivetrainType === "mecanum") {
      this.drivetrain = new MecanumDriveTrain(false);
    } else if (drivetrainType === "omni") {
      this.drivetrain = new MecanumDriveTrain(true);
    } else if (drivetrainType === "omni3") {
      this.drivetrain = new Omni3DriveTrain();
    } else if (drivetrainType === "tank") {
      this.drivetrain = new TankDriveTrain();
    }
    this.resetSpeeds();
  }

  resetSpeeds() {
    const nw = this.drivetrain.numWheels();
    this.wheelVelocities = new Array(nw).fill(0.0);
    this.inputVelocities = new Array(nw).fill(0.0);
    this.wheelSpins = new Array(nw).fill(0.0);
  }

  // Set individual wheel inputs
  moveWheel(index, amount) {
    if (index < this.drivetrain.numWheels()) {
      this.inputVelocities[index] = amount;
    }
  }

  clearInputVelocities() {
    for (let i = 0; i < this.drivetrain.numWheels(); i++) {
      this.inputVelocities[i] = 0.0;
    }
  }

  addInputVelocities(v) {
    for (let i = 0; i < this.drivetrain.numWheels(); i++) {
      this.inputVelocities[i] += v[i];
    }
  }

  subtractInputVelocities(v) {
    for (let i = 0; i < this.drivetrain.numWheels(); i++) {
      this.inputVelocities[i] -= v[i];
    }
  }

  // Update physics loop
  update(dt, speedMultiplier, rotSpeedMultiplier) {
    // 1. Calculate Target Velocities based on inputs
    let maxVelocity = 0.0;
    for (let i = 0; i < this.drivetrain.numWheels(); i++) {
      if (Math.abs(this.inputVelocities[i]) > maxVelocity) {
        maxVelocity = Math.abs(this.inputVelocities[i]);
      }
    }
    if (maxVelocity < 1.0) maxVelocity = 1.0;

    // Smoothly interpolate wheel velocities (slew rate / dampening)
    for (let i = 0; i < this.drivetrain.numWheels(); i++) {
      const target = this.inputVelocities[i] / maxVelocity;
      this.wheelVelocities[i] += (target - this.wheelVelocities[i]) / 10.0;
    }

    // 2. Animate wheel visual rotation
    for (let i = 0; i < this.drivetrain.numWheels(); i++) {
      // Scale wheel animation speed
      this.wheelSpins[i] += (this.wheelVelocities[i] * dt * 120.0);
    }

    // 3. Apply Kinematics translation and rotation
    this.drivetrain.updateWheelAngle(dt);
    
    // Apply speed multipliers
    const rotationRate = this.drivetrain.getRobotRotation(this.wheelVelocities) * rotSpeedMultiplier;
    this.rot += rotationRate * dt * 30.0;
    
    const movement = this.drivetrain.getRobotTranslation(this.wheelVelocities);
    
    // Rotate movement vector relative to robot heading
    const rad = this.rot;
    const rx = movement.x * Math.cos(rad) - movement.y * Math.sin(rad);
    const ry = movement.x * Math.sin(rad) + movement.y * Math.cos(rad);

    this.x += rx * speedMultiplier * dt * 30.0;
    this.y += ry * speedMultiplier * dt * 30.0;

    // 4. Record Trail Point
    if (Math.abs(rx) > 0.01 || Math.abs(ry) > 0.01 || Math.abs(rotationRate) > 0.001) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.maxTrailSize) {
        this.trail.shift();
      }
    }
  }

  // Draw the whole robot on screen
  draw(ctx, drawVectors, drawTrail, lockPosition, canvasWidth, canvasHeight) {
    const screenX = lockPosition ? canvasWidth / 2 : this.x;
    const screenY = lockPosition ? canvasHeight / 2 : this.y;

    // 1. Draw Trail
    if (drawTrail && this.trail.length > 1) {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      for (let i = 1; i < this.trail.length; i++) {
        const p1 = this.trail[i - 1];
        const p2 = this.trail[i];
        const alpha = i / this.trail.length;
        ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.4})`; // blue fading trail
        ctx.beginPath();
        if (lockPosition) {
          ctx.moveTo(p1.x + (canvasWidth / 2 - this.x), p1.y + (canvasHeight / 2 - this.y));
          ctx.lineTo(p2.x + (canvasWidth / 2 - this.x), p2.y + (canvasHeight / 2 - this.y));
        } else {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Draw Robot
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.rot);

    // Chassis Box shadow/glow
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = "rgba(59, 130, 246, 0.15)";
    
    // Draw Chassis Base
    ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
    ctx.lineWidth = 4;
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)"; // matching dark theme body
    
    ctx.beginPath();
    if (this.drivetrain.numWheels() === 3) {
      // Draw circular chassis for Kiwi drive
      const R = ROBOT_HEIGHT * 0.7;
      ctx.arc(0, 0, R + 15, 0, Math.PI * 2);
    } else {
      // Draw rectangular chassis
      const baseHeight = ROBOT_HEIGHT + ROBOT_BASE_HEIGHT_MARGIN * 2;
      ctx.roundRect(-ROBOT_WIDTH / 2, -baseHeight / 2, ROBOT_WIDTH, baseHeight, 16);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Circle showing front orientation (glowing cyan indicator)
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#3b82f6";
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    if (this.drivetrain.numWheels() === 3) {
      const R = ROBOT_HEIGHT * 0.7;
      // Front is at top (0, -R - 15)
      ctx.arc(0, -R - 15, 10, 0, Math.PI * 2);
    } else {
      ctx.arc(0, -ROBOT_HEIGHT / 2 - ROBOT_BASE_HEIGHT_MARGIN + 12, 10, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();

    // Hub center decorations
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -ROBOT_HEIGHT / 2);
    ctx.lineTo(0, ROBOT_HEIGHT / 2);
    ctx.moveTo(-ROBOT_WIDTH / 3, 0);
    ctx.lineTo(ROBOT_WIDTH / 3, 0);
    ctx.stroke();

    // Draw wheels
    this.drivetrain.drawWheels(ctx, this.wheelSpins, this.wheelVelocities);

    // 3. Draw Force Vectors
    if (drawVectors) {
      this.drawForceVectors(ctx);
    }

    ctx.restore();
  }

  drawForceVectors(ctx) {
    ctx.save();

    // Translate Vector Arrow (Neon Green)
    const movement = this.drivetrain.getRobotTranslation(this.wheelVelocities);
    const mag = Math.hypot(movement.x, movement.y);
    if (mag > 0.05) {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#10b981";
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 5;

      const arrowEndX = movement.x * FORCE_ARROW_LENGTH;
      const arrowEndY = movement.y * FORCE_ARROW_LENGTH;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(arrowEndX, arrowEndY);
      ctx.stroke();

      // Arrowhead calculations
      const angle = Math.atan2(arrowEndY, arrowEndX);
      const headlen = 12; // length of head in pixels
      ctx.beginPath();
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(arrowEndX - headlen * Math.cos(angle - Math.PI / 6), arrowEndY - headlen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(arrowEndX - headlen * Math.cos(angle + Math.PI / 6), arrowEndY - headlen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
      ctx.restore();
    }

    // Rotational Torque Arrow (Neon Orange)
    const rotation = this.drivetrain.getRobotRotation(this.wheelVelocities) * TORQUE_ARROW_SCALE;
    if (Math.abs(rotation) > 0.01) {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#f59e0b";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 4;
      ctx.noFill ? ctx.noFill() : null;

      const arcWidth = (ROBOT_HEIGHT + ROBOT_BASE_HEIGHT_MARGIN) * 1.5;
      const radius = arcWidth / 2;
      
      let startAngle = -Math.PI / 2;
      let endAngle = -Math.PI / 2;
      let arrowEndAngle = 0;

      if (rotation > 0.0) {
        endAngle += rotation;
        arrowEndAngle = endAngle;
      } else {
        startAngle += rotation;
        arrowEndAngle = startAngle;
      }

      // Draw two arcs for symmetry
      ctx.beginPath();
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, radius, startAngle + Math.PI, endAngle + Math.PI);
      ctx.stroke();

      // Draw Arrowheads
      this.drawTorqueArrowhead(ctx, radius, arrowEndAngle, rotation < 0);
      this.drawTorqueArrowhead(ctx, radius, arrowEndAngle + Math.PI, rotation < 0);

      ctx.restore();
    }

    ctx.restore();
  }

  drawTorqueArrowhead(ctx, radius, angle, isInverted) {
    ctx.save();
    ctx.translate(radius * Math.cos(angle), radius * Math.sin(angle));
    ctx.rotate(angle + (isInverted ? -Math.PI / 2 : Math.PI / 2));
    
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(0, 0);
    ctx.lineTo(-10, 8);
    ctx.stroke();
    ctx.restore();
  }

  // Telemetry details mapping
  getTelemetry() {
    let names = [];
    if (this.drivetrain.numWheels() === 4) {
      names = ["FL", "FR", "BL", "BR"];
    } else if (this.drivetrain.numWheels() === 3) {
      names = ["Front", "BR", "BL"];
    } else {
      names = ["Left", "Right"];
    }
    return {
      x: this.x.toFixed(1),
      y: this.y.toFixed(1),
      rot: ((this.rot * 180) / Math.PI % 360).toFixed(1),
      wheelVelocities: this.wheelVelocities.map(v => v.toFixed(2)),
      wheelNames: names
    };
  }
}
