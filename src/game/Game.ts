// Main game loop + rules

import { Meatling } from './Meatling';
import { input, ACTIONS } from './Input';
import { audio } from './Audio';

const W = 960;
const H = 720;
const ARENA_MARGIN = 42;

export class Game {
  p1 = new Meatling(240, 360, 0);
  p2 = new Meatling(720, 360, 8);

  mode: 'pvp' | 'ai' = 'ai';
  lastSwingTime = 0;
  frame = 0;

  winner: 'p1' | 'p2' | null = null;
  paused = false;

  // Collectible soul orbs on the island — strategic healing pickups
  powerups: Array<{ x: number; y: number; r: number }> = [];

  constructor() {
    this.powerups = this.spawnPowerups();
  }

  reset() {
    this.p1.reset(260, 360, 14);
    this.p2.reset(700, 360, 2);
    this.winner = null;
    this.frame = 0;
    this.powerups = this.spawnPowerups();
  }

  private spawnPowerups() {
    // Strategic positions around the arena (not too close to start)
    return [
      { x: 310, y: 265, r: 12 },
      { x: 650, y: 475, r: 12 },
      { x: 470, y: 535, r: 11 },
      { x: 530, y: 220, r: 10 },
    ];
  }

  // Returns true if a powerup was collected (caller can spawn particles / sound)
  tryCollectPowerup(x: number, y: number, radius: number): boolean {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      if (Math.hypot(p.x - x, p.y - y) < p.r + radius) {
        this.powerups.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  update(dt: number) {
    if (this.paused || this.winner) return;

    input.update();

    // Player 1 input
    this.p1.applyActions(input.getP1(), dt);

    // Player 2 / AI
    let p2SwingMask = 0;
    if (this.mode === 'ai') {
      p2SwingMask = this.p2.think(this.p1, dt, 1.0);
    } else {
      this.p2.applyActions(input.getP2(), dt);
    }

    // Swing processing for P1
    this.handleSwings(this.p1, this.p2, input.getP1());

    // Swing processing for P2/AI
    const p2Mask = this.mode === 'ai' ? p2SwingMask : input.getP2();
    this.handleSwings(this.p2, this.p1, p2Mask);

    // Simple collision between meatlings (push apart)
    const dx = this.p2.x - this.p1.x;
    const dy = this.p2.y - this.p1.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 52) {
      const push = (52 - dist) * 0.5;
      const nx = dx / dist;
      const ny = dy / dist;
      this.p1.x -= nx * push;
      this.p1.y -= ny * push;
      this.p2.x += nx * push;
      this.p2.y += ny * push;
    }

    // Clamp both
    this.clamp(this.p1);
    this.clamp(this.p2);

    // Check win condition
    if (!this.winner) {
      if (this.p1.isDead) this.winner = 'p2';
      if (this.p2.isDead) this.winner = 'p1';
    }

    input.postUpdate();
    this.frame++;
  }

  private handleSwings(attacker: Meatling, defender: Meatling, mask: number) {
    let swung = false;
    let arm: 'left' | 'right' = 'right';
    let power = 1.0;

    if (mask & ACTIONS.LEFT_IN || mask & ACTIONS.LEFT_OUT) {
      if (attacker.swing('leftIn')) {
        swung = true;
        arm = 'left';
        power = 0.85; // shield arm hits are weaker
      }
    }
    if (mask & ACTIONS.RIGHT_IN || mask & ACTIONS.RIGHT_OUT) {
      if (attacker.swing('rightIn')) {
        swung = true;
        arm = 'right';
        power = attacker.attackPower; // real weapon power
      }
    }

    if (swung) {
      audio.swing(arm, power);

      const dist = Math.hypot(attacker.x - defender.x, attacker.y - defender.y);
      if (dist < 72) {
        const hitAngle = Math.atan2(defender.y - attacker.y, defender.x - attacker.x);
        const dmg = (arm === 'right' ? 2.6 : 1.7) * power;

        defender.takeDamage(dmg, hitAngle);

        audio.hit(dmg);

        // More dramatic sever chance when hitting with real power
        if (dmg > 3.2 && Math.random() < 0.28) {
          audio.limbSever();
        }
      }
    }
  }

  private clamp(m: Meatling) {
    m.x = Math.max(ARENA_MARGIN, Math.min(W - ARENA_MARGIN, m.x));
    m.y = Math.max(ARENA_MARGIN, Math.min(H - ARENA_MARGIN, m.y));
  }

  togglePause() {
    this.paused = !this.paused;
  }

  toggleSound() {
    const on = audio.toggle();
    if (on) audio.playMenuTone();
  }
}
