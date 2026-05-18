import './style.css';
import { Game } from './game/Game';
import { input } from './game/Input';
import { audio } from './game/Audio';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: true })!;

const game = new Game();
let lastTime = performance.now();

function drawMeatling(m: any, color: string, label: string) {
  const { x, y, angle, limbs } = m;
  const rad = (angle * Math.PI * 2) / 16;
  const size = 17;

  // Body (meat)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // Head direction indicator
  const hx = x + Math.cos(rad) * (size + 4);
  const hy = y + Math.sin(rad) * (size + 4);
  ctx.fillStyle = limbs.head > 4 ? '#f1f5f9' : '#7f1d1d';
  ctx.beginPath();
  ctx.arc(hx, hy, 6, 0, Math.PI * 2);
  ctx.fill();

  // Shield arm (left)
  const leftAng = rad - 0.9;
  const lx = x + Math.cos(leftAng) * (size + 2);
  const ly = y + Math.sin(leftAng) * (size + 2);
  ctx.strokeStyle = limbs.leftShield > 2 ? '#64748b' : '#3f2a1f';
  ctx.lineWidth = Math.max(2, limbs.leftShield / 3);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(lx, ly);
  ctx.stroke();

  // Weapon arm (right)
  const rightAng = rad + 0.9;
  const rx = x + Math.cos(rightAng) * (size + 3);
  const ry = y + Math.sin(rightAng) * (size + 3);
  ctx.strokeStyle = limbs.weapon > 2 ? '#e2e8f0' : '#3f2a1f';
  ctx.lineWidth = Math.max(2.5, limbs.weapon / 2.5);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(rx, ry);
  ctx.stroke();

  // Label + health
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y - size - 10);

  // Tiny limb health bars
  const barY = y + size + 8;
  const keys: (keyof typeof limbs)[] = ['leftShield', 'weapon'];
  keys.forEach((k, i) => {
    const val = limbs[k];
    ctx.fillStyle = val > 5 ? '#4ade80' : val > 2 ? '#f59e0b' : '#b91c1c';
    ctx.fillRect(x - 12 + i * 13, barY, Math.max(2, val / 1.4), 2);
  });
}

function drawArena() {
  // Dark island floor
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.ellipse(480, 370, 310, 235, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle shore line
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(480, 370, 318, 242, 0, 0, Math.PI * 2);
  ctx.stroke();

  // A few "powerup" dots (visual only for now)
  ctx.fillStyle = '#c084fc33';
  ctx.fillRect(310, 290, 5, 5);
  ctx.fillRect(640, 430, 5, 5);
  ctx.fillRect(420, 510, 5, 5);
}

function draw() {
  ctx.fillStyle = '#0f1116';
  ctx.fillRect(0, 0, 960, 720);

  drawArena();

  // Meatlings
  drawMeatling(game.p1, '#c2410c', 'P1');
  drawMeatling(game.p2, '#854d0e', game.mode === 'ai' ? 'AI' : 'P2');

  // Blood / gore particles would go here later

  // Win banner
  if (game.winner) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 280, 960, 160);
    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${game.winner.toUpperCase()} WINS`, 480, 340);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Press R to fight again', 480, 380);
  }

  // Pause
  if (game.paused) {
    ctx.fillStyle = 'rgba(15,17,22,0.7)';
    ctx.fillRect(0, 0, 960, 720);
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 480, 360);
  }
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

  game.update(dt);
  draw();
  updateStatus();

  // Keyboard commands
  if (input.justPressed('r')) {
    game.reset();
  }
  if (input.justPressed('m')) {
    game.toggleSound();
  }
  if (input.justPressed('escape')) {
    game.togglePause();
  }
  // Toggle AI / 2P with T
  if (input.justPressed('t')) {
    game.mode = game.mode === 'ai' ? 'pvp' : 'ai';
    game.reset();
  }

  input.postUpdate();
  requestAnimationFrame(loop);
}

// Boot
function start() {
  // Start with a little menu tone
  setTimeout(() => audio.playMenuTone(), 420);

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
