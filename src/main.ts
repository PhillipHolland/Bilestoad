import './style.css';
import { Game } from './game/Game';
import { input } from './game/Input';
import { audio } from './game/Audio';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: true })!;

const game = new Game();
let lastTime = performance.now();

// === Particle system for blood & flying limbs ===
type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  size: number;
  color: string;
  rot?: number;
  rotSpeed?: number;
};

let particles: Particle[] = [];

function spawnBlood(x: number, y: number, count: number, spread = 1.8) {
  for (let i = 0; i < count; i++) {
    const ang = (Math.random() - 0.5) * Math.PI * spread;
    const speed = 1.4 + Math.random() * 3.2;
    particles.push({
      x, y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed - 0.6,
      life: 16 + Math.random() * 26,
      size: 2.2 + Math.random() * 2.8,
      color: Math.random() > 0.55 ? '#9f1239' : '#7f1d1d'
    });
  }
}

function spawnChunk(x: number, y: number, baseVx: number, baseVy: number, isAxe = false) {
  particles.push({
    x, y,
    vx: baseVx + (Math.random() - 0.5) * 2.2,
    vy: baseVy + (Math.random() - 0.5) * 2.2 - 1.1,
    life: 34 + Math.random() * 22,
    size: isAxe ? 7 : 5.5 + Math.random() * 2.5,
    color: isAxe ? '#64748b' : '#3f2a1f',
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.35
  });
}

// Screen shake
let shake = { x: 0, y: 0 };
function addShake(amount: number) {
  shake.x += (Math.random() - 0.5) * amount;
  shake.y += (Math.random() - 0.5) * amount;
}

// === MUCH better modern meatling renderer ===
function drawMeatling(m: any, bodyColor: string, label: string, isPlayer1: boolean) {
  const { x, y, angle, limbs } = m;
  const rad = (angle * Math.PI * 2) / 16;
  const cx = x, cy = y;

  // Slight bob when moving
  const bob = Math.sin(Date.now() / 140) * 0.6;

  // === Animation juice from model: swing recoil/telegraph + directional hit flinch ===
  const lSwing = Math.max(0, 1 - ((m.leftSwingTime || 999) / 13));   // peaks right after swing
  const rSwing = Math.max(0, 1 - ((m.rightSwingTime || 999) / 16));
  const hitFlinch = Math.max(0, 1 - ((m.lastHitTime || 999) / 10));
  const flinchTilt = hitFlinch * 0.22 * Math.sin(((m.hitAngle || 0) + 1) * 2.1);

  // === Body (now significantly larger for readability) ===
  const s = 1.9; // scale factor — characters are now much easier to read
  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.scale(s, s);

  // Hit reaction: whole body leans away from the blow
  if (hitFlinch > 0.05) {
    ctx.rotate(flinchTilt);
  }

  // Main torso
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 2, 19, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Armor plates / ridges for modern look
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 3, 14, 10, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Grotesque damage: blood stains when torso or head badly hurt
  if (limbs.torso < 7) {
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(-5, 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, -2, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
  if (limbs.head < 6) {
    ctx.fillStyle = '#9f1239';
    ctx.beginPath();
    ctx.arc(0, -5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // === HEAD (more characterful) ===
  const headOffset = 14;
  const hx = Math.cos(rad) * headOffset;
  const hy = Math.sin(rad) * headOffset - 1;

  // Head base
  ctx.fillStyle = limbs.head > 5 ? '#111827' : '#3f2a1f';
  ctx.beginPath();
  ctx.arc(hx, hy, 9, 0, Math.PI * 2);
  ctx.fill();

  // "Toad helmet" / visor detail
  ctx.fillStyle = limbs.head > 3 ? '#334155' : '#1f2937';
  ctx.beginPath();
  ctx.arc(hx + Math.cos(rad) * 2, hy + Math.sin(rad) * 1.5, 6, 0, Math.PI * 2);
  ctx.fill();

  // Eye slit glow
  if (limbs.head > 4) {
    ctx.fillStyle = isPlayer1 ? '#f472b6' : '#c084fc';
    ctx.fillRect(hx + Math.cos(rad) * 5 - 1.5, hy + Math.sin(rad) * 3 - 1, 3, 2);
  }

  // === LEFT ARM (Shield) ===
  // Animated shield bash: extends + rotates on recent swing
  const leftAng = rad - 1.05 + lSwing * 0.85;
  const shieldLen = 18 + lSwing * 4.5;
  const shieldX = Math.cos(leftAng) * shieldLen;
  const shieldY = Math.sin(leftAng) * shieldLen;

  if (limbs.leftShield > 1.5) {
    // Shield arm (punchier when swinging)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 7 + lSwing * 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(shieldX * 0.65, shieldY * 0.65 + 1);
    ctx.stroke();

    // Shield plate (thrust forward on swing)
    ctx.fillStyle = limbs.leftShield > 5 ? '#64748b' : '#475569';
    ctx.beginPath();
    ctx.ellipse(shieldX, shieldY, 9 + lSwing * 1.5, 6 + lSwing * 0.8, leftAng + 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e2937';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Bloody stump
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(Math.cos(leftAng) * 11, Math.sin(leftAng) * 11, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // === RIGHT ARM (Axe / Weapon) ===
  // Powerful chop animation: axe swings forward + extends on rSwing for juicy impact feel
  const rightAng = rad + 1.15 - rSwing * 1.45;  // chop rotates the swing arc
  const axeLen = 20 + rSwing * 7;
  const axeX = Math.cos(rightAng) * axeLen;
  const axeY = Math.sin(rightAng) * axeLen;

  if (limbs.weapon > 1.5) {
    // Arm (thickens on power swing)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6.5 + rSwing * 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(axeX * 0.55, axeY * 0.55);
    ctx.stroke();

    // Axe handle
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3 + rSwing * 0.6;
    ctx.beginPath();
    ctx.moveTo(axeX * 0.5, axeY * 0.5);
    ctx.lineTo(axeX, axeY);
    ctx.stroke();

    // Axe head — more menacing and extended during the chop
    ctx.fillStyle = limbs.weapon > 6 ? '#94a3b8' : '#64748b';
    const chop = rSwing * 1.6;
    ctx.beginPath();
    ctx.moveTo(axeX, axeY);
    ctx.lineTo(axeX + Math.cos(rightAng + 1.4 + chop * 0.3) * (9 + chop * 2), axeY + Math.sin(rightAng + 1.4 + chop * 0.3) * (9 + chop * 2));
    ctx.lineTo(axeX + Math.cos(rightAng - 1.1 - chop * 0.2) * (7 + chop), axeY + Math.sin(rightAng - 1.1 - chop * 0.2) * (7 + chop));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Stump where the axe was
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(Math.cos(rightAng) * 12, Math.sin(rightAng) * 12, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // === Label + status ===
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy - 28);

  // Health indicator (small but clear)
  const hp = Math.floor(m.health);
  ctx.fillStyle = hp > 10 ? '#4ade80' : hp > 5 ? '#fbbf24' : '#ef4444';
  ctx.fillText(`HP ${hp}`, cx, cy + 32);
}

function drawArena() {
  // Water / void around the island
  ctx.fillStyle = '#0b0c12';
  ctx.fillRect(0, 0, 960, 720);

  // Island floor (darker, more detailed)
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.ellipse(480, 370, 305, 230, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lighter ground texture
  ctx.fillStyle = '#33415522';
  ctx.beginPath();
  ctx.ellipse(470, 365, 220, 165, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Shoreline / rocks
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(480, 370, 312, 238, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner detail line
  ctx.strokeStyle = '#1e2937';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(475, 362, 265, 195, 0.1, 0, Math.PI * 2);
  ctx.stroke();

  // Scattered debris / powerup hints (yin-yang style)
  ctx.fillStyle = '#c084fc';
  ctx.fillRect(295, 275, 4, 4);
  ctx.fillRect(655, 445, 4, 4);
  ctx.fillRect(415, 505, 4, 4);

  ctx.fillStyle = '#64748b44';
  ctx.fillRect(570, 265, 3, 3);
  ctx.fillRect(340, 470, 3, 3);

  // Extra island gore flavor: bones, rocks, old blood
  ctx.fillStyle = '#47556955';
  ctx.fillRect(380, 310, 7, 3);
  ctx.fillRect(590, 430, 5, 4);
  ctx.fillRect(310, 440, 4, 6);

  ctx.fillStyle = '#3f2a1f66';
  ctx.fillRect(450, 280, 8, 2);
  ctx.fillRect(520, 455, 6, 3);
}

function drawPowerups() {
  for (const p of game.powerups) {
    ctx.save();
    ctx.translate(p.x, p.y);

    // Outer glow
    ctx.fillStyle = 'rgba(192, 132, 252, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, p.r + 7, 0, Math.PI * 2);
    ctx.fill();

    // Core orb
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();

    // Bright inner core
    ctx.fillStyle = '#e0b3ff';
    ctx.beginPath();
    ctx.arc(0, 0, p.r * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing ring
    const pulse = Math.sin(Date.now() / 160) * 2.5;
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, p.r + 4 + pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

function draw() {
  // Apply screen shake
  const sx = Math.max(-6, Math.min(6, shake.x));
  const sy = Math.max(-6, Math.min(6, shake.y));
  ctx.save();
  ctx.translate(sx, sy);

  ctx.fillStyle = '#0f1116';
  ctx.fillRect(0, 0, 960, 720);

  drawArena();

  // Collectible powerup orbs (strategic depth)
  drawPowerups();

  // Meatlings — much more detailed now
  drawMeatling(game.p1, '#c2410c', 'P1', true);
  drawMeatling(game.p2, '#854d0e', game.mode === 'ai' ? 'CPU' : 'P2', false);

  // === Particles (blood + flying chunks) ===
  ctx.fillStyle = '#9f1239';
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const alpha = Math.max(0.1, p.life / 40);
    ctx.globalAlpha = alpha;

    if (p.rot !== undefined) {
      // Chunk with rotation (more modern look)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot!);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.restore();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  ctx.restore(); // end shake

  // Win banner
  if (game.winner) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 280, 960, 160);
    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${game.winner.toUpperCase()} WINS`, 480, 345);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('Press R to fight again', 480, 385);
  }

  // Pause overlay
  if (game.paused) {
    ctx.fillStyle = 'rgba(15,17,22,0.75)';
    ctx.fillRect(0, 0, 960, 720);
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 480, 360);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ESC to resume', 480, 390);
  }

  // Decay shake
  shake.x *= 0.82;
  shake.y *= 0.82;
  if (Math.abs(shake.x) < 0.3) shake.x = 0;
  if (Math.abs(shake.y) < 0.3) shake.y = 0;
}

function updateStatus() {
  const p1El = document.getElementById('p1-status')!;
  const p2El = document.getElementById('p2-status')!;
  const modeEl = document.getElementById('mode')!;

  p1El.textContent = `P1: ${game.p1.isDead ? 'DEAD' : game.p1.health}`;
  p2El.textContent = game.mode === 'ai' 
    ? `AI: ${game.p2.isDead ? 'DEAD' : game.p2.health}`
    : `P2: ${game.p2.isDead ? 'DEAD' : game.p2.health}`;
  modeEl.textContent = game.mode === 'ai' ? 'vs AI' : '2P HOTSEAT';
}

function loop(now: number) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  // Store previous health to detect big damage
  const prevP1 = game.p1.health;
  const prevP2 = game.p2.health;

  game.update(dt);

  // Powerup collection (strategic healing orbs)
  if (game.tryCollectPowerup(game.p1.x, game.p1.y, 19)) {
    spawnBlood(game.p1.x, game.p1.y, 8 + Math.random() * 3, 2.5);
    addShake(1.6);
  }
  if (game.tryCollectPowerup(game.p2.x, game.p2.y, 19)) {
    spawnBlood(game.p2.x, game.p2.y, 8 + Math.random() * 3, 2.5);
    addShake(1.4);
  }

  // === Visual feedback: blood + shake when someone gets hurt ===
  if (game.p1.health < prevP1 - 0.3) {
    spawnBlood(game.p1.x + (Math.random() - 0.5) * 18, game.p1.y + (Math.random() - 0.5) * 14, 5 + Math.random() * 4);
    addShake(2.8);
  }
  if (game.p2.health < prevP2 - 0.3) {
    spawnBlood(game.p2.x + (Math.random() - 0.5) * 18, game.p2.y + (Math.random() - 0.5) * 14, 5 + Math.random() * 4);
    addShake(2.8);
  }

  // Big dramatic moments (limb sever)
  if (game.p1.limbs.weapon < 2 && prevP1 > game.p1.health + 1) {
    spawnChunk(game.p1.x + 12, game.p1.y, 2.5, -1.8, true);
    addShake(5.5);
  }
  if (game.p2.limbs.weapon < 2 && prevP2 > game.p2.health + 1) {
    spawnChunk(game.p2.x - 12, game.p2.y, -2.8, -1.6, true);
    addShake(5.5);
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.985;
    p.vy += 0.14; // gravity
    p.life -= 1;

    if (p.rot !== undefined && p.rotSpeed) p.rot! += p.rotSpeed;

    if (p.life <= 0) particles.splice(i, 1);
  }

  draw();
  updateStatus();

  // Keyboard commands
  if (input.justPressed('r')) {
    particles = [];
    game.reset();
  }
  if (input.justPressed('m')) {
    game.toggleSound();
  }
  if (input.justPressed('escape')) {
    game.togglePause();
  }
  if (input.justPressed('t')) {
    game.mode = game.mode === 'ai' ? 'pvp' : 'ai';
    particles = [];
    game.reset();
  }

  input.postUpdate();
  requestAnimationFrame(loop);
}

// Boot
function start() {
  // Start with a little menu tone
  setTimeout(() => audio.playMenuTone(), 420);

  // Start the dark island ambient drone (gives the game atmosphere)
  setTimeout(() => audio.startAmbient(), 680);

  // First frame
  draw();
  updateStatus();

  // Kick the loop
  requestAnimationFrame(loop);

  // Nice console message
  console.log('%c[Bilestoad] Modern browser version ready. Sound uses Web Audio API.', 'color:#64748b');
}

start();

// Optional: expose for debugging
(window as any).BILESTOAD = { game, audio, input };
