// The heart of Bilestoad — a grotesque meatling with independently damaged limbs

import { ACTIONS } from './Input';

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

  // Combat state for juice
  leftSwingCooldown = 0;
  rightSwingCooldown = 0;
  leftSwingTime = 0;   // frames since last left swing (for animation)
  rightSwingTime = 0;  // frames since last right swing
  lastHitTime = 999;   // frames since last damage taken (for flinch)
  hitAngle = 0;        // world angle of last incoming hit (for directional flinch)

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

  // === Mechanical consequences of losing limbs (this is what makes it deep) ===
  get turnSpeed(): number {
    const shieldFactor = (this.limbs.leftShield + this.limbs.rightShield) / 22;
    return 0.65 + shieldFactor * 0.55; // badly damaged shields = slower turning
  }

  get moveSpeed(): number {
    const torsoFactor = this.limbs.torso / 14;
    const legFactor = (this.limbs.leftArm + this.limbs.leftShield) / 23;
    return 0.55 + Math.max(0, (torsoFactor + legFactor) / 2) * 1.35;
  }

  get attackPower(): number {
    return 0.6 + (this.limbs.weapon / 13) * 1.6;
  }

  get canUseShield(): boolean {
    return this.limbs.leftShield > 1.5 || this.limbs.leftArm > 1.5;
  }

  // Apply an action mask (from Input)
  applyActions(mask: number, dt: number) {
    const turnSpeed = this.turnSpeed;
    const moveSpeed = this.moveSpeed;

    // Turning (now affected by shield damage)
    if (mask & (1 << 4)) this.angle = (this.angle - turnSpeed) & 15;
    if (mask & (1 << 5)) this.angle = (this.angle + turnSpeed) & 15;

    // Thrust / movement (affected by torso + leg damage)
    const moving = !!(mask & (1 << 6));
    const rad = (this.angle * Math.PI * 2) / 16;

    if (moving) {
      this.vx += Math.cos(rad) * moveSpeed * 0.85;
      this.vy += Math.sin(rad) * moveSpeed * 0.85;
    }

    // Apply velocity + friction (slightly less slippery when healthy)
    const friction = 0.79 + (this.limbs.torso / 14) * 0.07;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= friction;
    this.vy *= friction;

    // Clamp inside arena
    const margin = 38;
    this.x = Math.max(margin, Math.min(960 - margin, this.x));
    this.y = Math.max(margin, Math.min(720 - margin, this.y));

    // Tick down swing cooldowns
    if (this.leftSwingCooldown > 0) this.leftSwingCooldown -= dt * 60;
    if (this.rightSwingCooldown > 0) this.rightSwingCooldown -= dt * 60;

    // Tick animation timers
    this.leftSwingTime += dt * 60;
    this.rightSwingTime += dt * 60;
    this.lastHitTime += dt * 60;
  }

  // Swing one of the four arm actions. Returns true if the swing actually happened.
  // Now has real cooldowns — you can't just mash.
  swing(action: 'leftIn' | 'leftOut' | 'rightIn' | 'rightOut'): boolean {
    const isLeft = action === 'leftIn' || action === 'leftOut';

    if (isLeft) {
      if (this.leftSwingCooldown > 0) return false;
      if (this.limbs.leftShield <= 1 && this.limbs.leftArm <= 1) return false;

      this.limbs.leftShield = Math.max(0, this.limbs.leftShield - 1);
      this.limbs.leftArm = Math.max(0, this.limbs.leftArm - 0.6);

      // Cooldown is longer if your shield arm is damaged
      const penalty = this.canUseShield ? 1 : 1.6;
      this.leftSwingCooldown = 11 * penalty;
      this.leftSwingTime = 0;
      return true;
    } else {
      if (this.rightSwingCooldown > 0) return false;
      if (this.limbs.weapon <= 1) return false;

      this.limbs.weapon = Math.max(0, this.limbs.weapon - 1);
      this.limbs.rightShield = Math.max(0, this.limbs.rightShield - 0.4);

      const penalty = Math.max(0.7, this.attackPower / 2.2);
      this.rightSwingCooldown = 14 / penalty; // weaker weapon arm = slower swings
      this.rightSwingTime = 0;
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

    // Record hit for visual flinch / reaction juice
    this.lastHitTime = 0;
    this.hitAngle = hitAngle;
  }

  // Significantly upgraded AI — now a real opponent that positions well, uses both arms,
  // respects its own damage state, circles intelligently, and actually lands hits.
  think(target: Meatling, dt: number, baseAggression = 1.0): number {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    // Tick cooldowns + animation timers ourselves (AI path bypasses applyActions)
    if (this.leftSwingCooldown > 0) this.leftSwingCooldown -= dt * 60;
    if (this.rightSwingCooldown > 0) this.rightSwingCooldown -= dt * 60;

    this.leftSwingTime += dt * 60;
    this.rightSwingTime += dt * 60;
    this.lastHitTime += dt * 60;

    const targetAngle = (Math.atan2(dy, dx) / (Math.PI * 2) * 16 + 8) & 15;

    const diff = ((targetAngle - this.angle + 8) & 15) - 8;

    // Use our own damaged stats for fair play
    const turn = this.turnSpeed;
    const moveSpd = this.moveSpeed;
    const myWeapon = this.limbs.weapon;
    const myHealth = this.health;

    // Dynamic aggression based on our weapon health + how crippled the target is
    const targetWeaponWeak = target.limbs.weapon < 6;
    const aggression = Math.max(0.55, baseAggression * (0.65 + (myWeapon / 13) * 0.7 + (targetWeaponWeak ? 0.45 : 0) - (myHealth < 6 ? 0.3 : 0)));

    let swingMask = 0;

    // === Responsive turning (penalized by shield damage) ===
    if (diff > 1.1) this.angle = (this.angle + turn) & 15;
    else if (diff < -1.1) this.angle = (this.angle - turn) & 15;

    // === Intelligent swing decisions (we return mask; Game will execute swing + damage) ===
    const goodAngle = Math.abs(diff) < 2.8;
    const canRightSwing = this.rightSwingCooldown <= 0.7 && myWeapon > 3.2;
    const canLeftSwing = this.leftSwingCooldown <= 0.5 && (this.limbs.leftShield > 2.2 || this.limbs.leftArm > 2);

    // Right (axe) swings — primary threat, committed when angle + range good
    if (dist > 46 && dist < 142 && canRightSwing) {
      let chance = goodAngle ? 0.22 : 0.055;
      if (dist < 82) chance *= 1.25; // closer = more desperate/aggressive
      if (Math.random() < chance * (aggression * 0.9 + 0.25)) {
        swingMask |= (myWeapon > 7.5 ? ACTIONS.RIGHT_IN : ACTIONS.RIGHT_OUT);
      }
    }

    // Left (shield) arm — faster pokes, good for pressure or when right arm tired
    if (dist < 98 && canLeftSwing) {
      const leftChance = (this.rightSwingCooldown > 4 ? 0.28 : 0.09) * (goodAngle ? 1.1 : 0.7);
      if (Math.random() < leftChance) {
        swingMask |= ACTIONS.LEFT_IN;
      }
    }

    // === Movement & positioning: circle, kite, flank ===
    const rad = (this.angle * Math.PI * 2) / 16;
    const forwardX = Math.cos(rad);
    const forwardY = Math.sin(rad);
    const sideX = -forwardY;   // perpendicular for strafing
    const sideY = forwardX;

    let mx = 0;
    let my = 0;

    const ideal = 82 + (myWeapon > 9 ? 18 : 4);  // preferred engagement distance

    if (dist > ideal + 52) {
      // Rush to engage
      mx = forwardX * 1.55 * aggression * moveSpd;
      my = forwardY * 1.55 * aggression * moveSpd;
    } else if (dist < 52) {
      // Too close: strafe sideways hard + slight backpedal for swing space
      mx = sideX * 1.25 * moveSpd + forwardX * (-0.75);
      my = sideY * 1.25 * moveSpd + forwardY * (-0.75);
    } else if (dist < ideal + 22) {
      // Sweet spot: circle for flank shots, apply side pressure
      const flankBias = Math.sin(diff * 0.85) * (targetWeaponWeak ? 1.4 : 1.0);
      mx = forwardX * 0.48 + sideX * flankBias * 1.3;
      my = forwardY * 0.48 + sideY * flankBias * 1.3;
      if (goodAngle && Math.random() < 0.55) {
        mx += forwardX * 0.55 * moveSpd * 0.65;
        my += forwardY * 0.55 * moveSpd * 0.65;
      }
    } else {
      // Hold good distance while threatening
      mx = forwardX * 0.82 * moveSpd * aggression;
      my = forwardY * 0.82 * moveSpd * aggression;
    }

    // Apply thrust + integrate with realistic friction from torso health
    this.vx += mx * 0.92;
    this.vy += my * 0.92;

    const friction = 0.815 + (this.limbs.torso / 14) * 0.065;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= friction;
    this.vy *= friction;

    // Arena clamp
    const margin = 42;
    this.x = Math.max(margin, Math.min(960 - margin, this.x));
    this.y = Math.max(margin, Math.min(720 - margin, this.y));

    return swingMask;
  }

  reset(x: number, y: number, angle = 0) {
    this.x = x; this.y = y; this.angle = angle & 15;
    this.vx = this.vy = 0;
    this.limbs = { head: 14, torso: 14, leftShield: 12, rightShield: 10, leftArm: 11, weapon: 13 };
    this.leftSwingCooldown = 0;
    this.rightSwingCooldown = 0;
    this.leftSwingTime = 999;
    this.rightSwingTime = 999;
    this.lastHitTime = 999;
  }
}
