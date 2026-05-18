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

  // Combat state for juice
  leftSwingCooldown = 0;
  rightSwingCooldown = 0;

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
      return true;
    } else {
      if (this.rightSwingCooldown > 0) return false;
      if (this.limbs.weapon <= 1) return false;

      this.limbs.weapon = Math.max(0, this.limbs.weapon - 1);
      this.limbs.rightShield = Math.max(0, this.limbs.rightShield - 0.4);

      const penalty = Math.max(0.7, this.attackPower / 2.2);
      this.rightSwingCooldown = 14 / penalty; // weaker weapon arm = slower swings
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

  // Improved AI — tries to be threatening instead of just randomly swinging
  think(target: Meatling, dt: number, aggression = 1) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const desired = (Math.atan2(dy, dx) / (Math.PI * 2) * 16 + 8) & 15;

    const diff = ((desired - this.angle + 8) & 15) - 8;

    // Smarter turning (respects its own damaged turn speed)
    const turn = this.turnSpeed;
    if (diff > 1) this.angle = (this.angle + turn) & 15;
    else if (diff < -1) this.angle = (this.angle - turn) & 15;

    // === Smarter behavior ===
    const myWeaponHealth = this.limbs.weapon;
    const wantToAttack = myWeaponHealth > 4 && this.rightSwingCooldown <= 2;

    if (dist > 195) {
      // Close the distance
      this.vx += Math.cos((this.angle * Math.PI * 2) / 16) * 1.35 * aggression;
      this.vy += Math.sin((this.angle * Math.PI * 2) / 16) * 1.35 * aggression;
    } else if (dist < 82 && !wantToAttack) {
      // Back off to create space for a good swing
      this.vx -= Math.cos((this.angle * Math.PI * 2) / 16) * 1.0;
      this.vy -= Math.sin((this.angle * Math.PI * 2) / 16) * 1.0;
    } else if (dist < 115 && wantToAttack) {
      // Good range — try to circle for a better angle instead of rushing
      const side = Math.sin(diff * 0.4) * 0.9;
      this.vx += Math.cos((this.angle * Math.PI * 2) / 16) * 0.6 + side;
      this.vy += Math.sin((this.angle * Math.PI * 2) / 16) * 0.6 + side * 0.6;
    }

    // Apply movement
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= 0.84;
    this.vy *= 0.84;

    // Occasional smart swings when in good position
    if (dist > 58 && dist < 125 && wantToAttack && Math.random() < 0.09) {
      const which = myWeaponHealth > 8 ? 'rightIn' : 'rightOut';
      if (this.swing(which)) {
        // will be picked up by Game
      }
    }

    // Clamp
    const margin = 38;
    this.x = Math.max(margin, Math.min(960 - margin, this.x));
    this.y = Math.max(margin, Math.min(720 - margin, this.y));
  }

  reset(x: number, y: number, angle = 0) {
    this.x = x; this.y = y; this.angle = angle & 15;
    this.vx = this.vy = 0;
    this.limbs = { head: 14, torso: 14, leftShield: 12, rightShield: 10, leftArm: 11, weapon: 13 };
    this.leftSwingCooldown = 0;
    this.rightSwingCooldown = 0;
  }
}
