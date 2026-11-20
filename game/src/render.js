// Rendering: the three.js scene, the chase camera, and Rico Vega's on-foot
// mesh. The camera trails behind the car while driving and behind Rico on
// foot, lerped so it never snaps; it also looks toward the mission marker
// during the cover shot. Shadows stay on — the sun is the city's whole look.
const THREE = window.THREE;
import { CAMERA } from './config.js';

export function createPlayerMesh() {
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x2a6aff });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2b3a55 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.36), jacket);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skin);
  head.position.y = 1.74;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.48), new THREE.MeshLambertMaterial({ color: 0xd84a4a }));
  cap.position.y = 1.98;
  group.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.68, 0.22), jeans);
  legL.position.set(-0.15, 0.34, 0);
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.68, 0.22), jeans);
  legR.position.set(0.15, 0.34, 0);
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.17), jacket);
  armL.position.set(-0.4, 1.05, 0);
  group.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.17), jacket);
  armR.position.set(0.4, 1.05, 0);
  group.add(armR);
  group.userData = { legL, legR, armL, armR };
  return group;
}

export function createRenderer(canvas) {
  const lowfx = new URLSearchParams(window.location.search).get('lowfx') === '1';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowfx });
  renderer.setPixelRatio(lowfx ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  // Low-fx mode (slow machines, software rendering): no shadows, half the
  // pixel work — the game still plays the same.
  renderer.shadowMap.enabled = !lowfx;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
  const camPos = new THREE.Vector3(0, 8, -14);
  const camLook = new THREE.Vector3(0, 1, 0);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /** Trail the player: high and far behind the car, closer behind Rico.
   * A staged shot may override the distance/height (G.shotCam). */
  function updateCamera(G, dt) {
    const px = G.inCar ? G.car.x : G.player.x;
    const pz = G.inCar ? G.car.z : G.player.z;
    const heading = G.inCar ? G.car.angle : G.player.angle;
    const speed = G.inCar ? Math.abs(G.car.speed) : 0;
    const dist = G.shotCam ? G.shotCam.dist : G.inCar ? 13 + speed * 0.12 : 8.5;
    const height = G.shotCam ? G.shotCam.height : G.inCar ? 5.2 + speed * 0.04 : 3.6;
    const tx = px - Math.cos(heading) * dist;
    const tz = pz - Math.sin(heading) * dist;
    const k = Math.min(1, 5 * dt);
    camPos.x += (tx - camPos.x) * k;
    camPos.y += (height - camPos.y) * k;
    camPos.z += (tz - camPos.z) * k;
    const lx = px + Math.cos(heading) * 20;
    const lz = pz + Math.sin(heading) * 20;
    camLook.x += (lx - camLook.x) * k;
    camLook.y += (1.4 - camLook.y) * k;
    camLook.z += (lz - camLook.z) * k;
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    // Crash shake: a hard hit rattles the camera for a beat.
    if (G.shake > 0) {
      G.shake = Math.max(0, G.shake - dt);
      camera.position.x += (Math.random() - 0.5) * G.shake * 1.2;
      camera.position.y += (Math.random() - 0.5) * G.shake * 0.8;
    }
  }

  function render() {
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, updateCamera, render, resize };
}
