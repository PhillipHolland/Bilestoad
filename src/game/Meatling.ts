// The heart of Bilestoad — a grotesque meatling with independently damaged limbs

export type Limb = 'head' | 'torso' | 'leftShield' | 'rightShield' | 'leftArm' | 'weapon';

export interface MeatlingState {
  x: number;
  y: number;
  angle: number;        // 0-15 like the original (16 directions)
  health: number;
  limbs: Record<Limb, number>; // 0 = severed, higher = better
}

export class Meatling {
  x: number;
  y: number;
  angle: number;          // 0–15
  vx = 0;
  vy = 0;

  // Limb health (higher = more intact). Original used very specific thresholds.
  limbs = {
    head: 14,
    torso: 14,
    leftShield: 12,
    rightShield: 10,
    leftArm: 11,
    weapon: 13,
  };

  constructor(x: number, y: number, angle = 0) {
    this.x = x;
    this.y = y;
    this.angle = angle & 15;
  }

  get health(): number {
    const vals = Object.values(this.limbs);
    return Math.floor(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  get isDead(): boolean {
    return this.limbs.head <= 0 || this.limbs.torso <= 0 || this.health < 3;
  }

  // Apply an action mask (from Input)
  applyActions(mask: number, dt: number, speed = 1.8) {
    // Turning
    if (mask & (1 << 4)) this.angle = (this.angle - 1) & 15; // TURN_LEFT
    if (mask & (1 << 5)) this.angle = (this.angle + 1) & 15; // TURN_RIGHT

    // Thrust / movement
    const moving = !!(mask & (1 << 6));
    const rad = (this.angle * Math.PI * 2) / 16;

    if (moving) {
      this.vx += Math.cos(rad) * speed * 0.6;
      this.vy += Math.sin(rad) * speed * 0.6;
    }

    // Apply velocity + friction
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= 0.82;
    this.vy *= 0.82;

    // Clamp inside arena
    const margin = 38;
    this.x = Math.max(margin, Math.min(960 - margin, this.x));
    this.y = Math.max(margin, Math.min(720 - margin, this.y));
  }

  // Swing one of the four arm actions. Returns true if the swing actually happened.
  swing(action: 'leftIn' | 'leftOut' | 'rightIn' | 'rightOut'): boolean {
    if (action === 'leftIn' || action === 'leftOut') {
      if (this.limbs.leftShield <= 1 && this.limbs.leftArm <= 1) return false;
      this.limbs.leftShield = Math.max(0, this.limbs.leftShield - 1);
      this.limbs.leftArm = Math.max(0, this.limbs.leftArm - 0.6);
      return true;
    } else {
      if (this.limbs.weapon <= 1) return false;
      this.limbs.weapon = Math.max(0, this.limbs.weapon - 1);
      this.limbs.rightShield = Math.max(0, this.limbs.rightShield - 0.4);
      return true;
    }
  }

  // Called when hit by an enemy swing. Damage depends on which limb was hit.
  takeDamage(amount: number, hitAngle: number) {
    const da = Math.abs(((this.angle - (hitAngle / (Math.PI * 2) * 16)) + 8) % 16 - 8);

    if (da < 3) {
      // Frontal hit — weapon or head
      this.limbs.weapon = Math.max(0, this.limbs.weapon - amount * 0.9);
      this.limbs.head = Math.max(0, this.limbs.head - amount * 0.5);
    } else if (da < 6) {
      // Side hit
      this.limbs.leftShield = Math.max(0, this.limbs.leftShield - amount);
      this.limbs.rightShield = Math.max(0, this.limbs.rightShield - amount * 0.7);
    } else {
      // Back / glancing
      this.limbs.torso = Math.max(0, this.limbs.torso - amount * 0.6);
    }

    // Random chance to sever something important on big hits
    if (amount > 2.5 && Math.random() < 0.35) {
      const keys = Object.keys(this.limbs) as (keyof typeof this.limbs)[];
      const k = keys[Math.floor(Math.random() * keys.length)];
      this.limbs[k] = Math.max(0, this.limbs[k] - 3);
    }
  }

  // Simple AI — very close to the 1983 ROBOT routine
  think(target: Meatling, dt: number, aggression = 1) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const desired = (Math.atan2(dy, dx) / (Math.PI * 2) * 16 + 8) & 15;

    // Turn toward target
    const diff = ((desired - this.angle + 8) & 15) - 8;
    if (diff > 1) this.angle = (this.angle + 1) & 15;
    else if (diff < -1) this.angle = (this.angle - 1) & 15;

    // Crude health-based aggression (exactly like the original)
    // (we can expand this later — for now the simple distance AI works well)

    // Move toward if far, away if too close
    if (dist > 170) {
      this.vx += Math.cos((this.angle * Math.PI * 2) / 16) * 1.1 * aggression;
      this.vy += Math.sin((this.angle * Math.PI * 2) / 16) * 1.1 * aggression;
    } else if (dist < 95) {
      this.vx -= Math.cos((this.angle * Math.PI * 2) / 16) * 0.8;
      this.vy -= Math.sin((this.angle * Math.PI * 2) / 16) * 0.8;
    }

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= 0.86;
    this.vy *= 0.86;

    // Clamp
    const margin = 38;
    this.x = Math.max(margin, Math.min(960 - margin, this.x));
    this.y = Math.max(margin, Math.min(720 - margin, this.y));
  }

  reset(x: number, y: number, angle = 0) {
    this.x = x; this.y = y; this.angle = angle & 15;
    this.vx = this.vy = 0;
    this.limbs = { head: 14, torso: 14, leftShield: 12, rightShield: 10, leftArm: 11, weapon: 13 };
  }
}
