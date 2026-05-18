import './style.css';
import * as THREE from 'three';

// =====================================================
// BILESTOAD 2026
// Semi-realistic angled 3D • Grounded + Aggressive
// =====================================================

const container = document.getElementById('game-container')!;

// Three.js Setup
const renderer = new THREE.WebGLRenderer({ 
  antialias: true, 
  powerPreference: "high-performance" 
});
renderer.setSize(1280, 820);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a0b0f, 22, 55);

// Cinematic Angled Camera
const camera = new THREE.PerspectiveCamera(48, 1280 / 820, 0.5, 120);
camera.position.set(0, 26, 22);
camera.lookAt(0, 2, 0);

// Lighting
const hemi = new THREE.HemisphereLight(0x4a5568, 0x0f1116, 0.55);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1d6, 1.15);
sun.position.set(22, 32, 14);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.near = 8;
sun.shadow.camera.far = 90;
sun.shadow.camera.left = -28;
sun.shadow.camera.right = 28;
sun.shadow.camera.top = 28;
sun.shadow.camera.bottom = -28;
scene.add(sun);

// Arena Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(52, 52),
  new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.92 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Simple Prototype Meatling
function createMeatling(color: number) {
  const g = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.35, 2.9, 14),
    new THREE.MeshStandardMaterial({ color, roughness: 0.65 })
  );
  torso.castShadow = true;
  g.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.55 })
  );
  head.position.y = 2.2;
  head.castShadow = true;
  g.add(head);

  // Left Arm (Shield side)
  const lArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.36, 2.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
  );
  lArm.position.set(-1.7, 0.9, 0);
  lArm.rotation.z = 0.55;
  lArm.castShadow = true;
  g.add(lArm);

  // Right Arm (Axe side)
  const rArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.38, 2.7, 10),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
  );
  rArm.position.set(1.85, 1.0, 0);
  rArm.rotation.z = -0.65;
  rArm.castShadow = true;
  g.add(rArm);

  // Axe blade
  const axe = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.4, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.35 })
  );
  axe.position.set(2.9, 1.9, 0);
  axe.castShadow = true;
  g.add(axe);

  return g;
}

const player = createMeatling(0xc2410c);
player.position.set(-7, 1.6, 0);
scene.add(player);

const enemy = createMeatling(0x854d0e);
enemy.position.set(7, 1.6, 0);
scene.add(enemy);

// Input
const keys: Record<string, boolean> = {};
window.addEventListener('keydown', e => (keys[e.key.toLowerCase()] = true));
window.addEventListener('keyup', e => (keys[e.key.toLowerCase()] = false));

let playerAngle = Math.PI * 0.75;

function animate() {
  requestAnimationFrame(animate);

  // Grounded + Deliberate movement
  const forward = (keys['w'] || keys['arrowup']) ? 1 : (keys['s'] || keys['arrowdown']) ? -1 : 0;
  const strafe = (keys['a'] || keys['arrowleft']) ? -1 : (keys['d'] || keys['arrowright']) ? 1 : 0;

  // Deliberate turning
  if (keys['q']) playerAngle -= 0.048;
  if (keys['e']) playerAngle += 0.048;

  const dirX = Math.sin(playerAngle);
  const dirZ = Math.cos(playerAngle);

  const speed = 0.135;
  player.position.x += (dirX * forward + dirZ * strafe) * speed;
  player.position.z += (dirZ * forward - dirX * strafe) * speed;

  player.rotation.y = playerAngle + Math.PI;

  // Aggressive committed attack
  if (keys[' ']) {
    player.position.y = 2.4;
    setTimeout(() => { player.position.y = 1.6; }, 160);
  }

  // Cinematic camera follow
  const camTargetX = player.position.x * 0.55;
  const camTargetZ = player.position.z * 0.55 - 5.5;
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, camTargetX, 0.09);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, camTargetZ, 0.09);
  camera.lookAt(player.position.x, 5.5, player.position.z);

  renderer.render(scene, camera);
}

animate();

// Resize
function resize() {
  const w = Math.min(window.innerWidth * 0.96, 1400);
  const h = Math.min(window.innerHeight * 0.88, 880);
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

console.log('%c[Bilestoad 2026] Three.js foundation running. Semi-realistic direction active.', 'color:#64748b');
