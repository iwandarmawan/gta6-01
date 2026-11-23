// Renderer, third-person camera rig and the day/night cycle:
// one sun, one sky colour and one fog that all follow the clock.

const THREE = window.THREE;

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87bfe8);
  scene.fog = new THREE.Fog(0x87bfe8, 180, 700);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 40, 80);

  const sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -280;
  sun.shadow.camera.right = 280;
  sun.shadow.camera.top = 280;
  sun.shadow.camera.bottom = -280;
  sun.shadow.camera.far = 700;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x8a7a5a, 0.9);
  scene.add(hemi);

  function resize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  return { renderer, scene, camera, sun, hemi, resize };
}

// timeOfDay is 0..1 (0 = midnight, 0.5 = noon). Returns the night
// factor 0 (full day) .. 1 (full night) for lamps and windows.
export function updateDayNight(env, timeOfDay) {
  const { scene, sun, hemi } = env;
  const angle = timeOfDay * Math.PI * 2 - Math.PI / 2; // noon = overhead
  const elev = Math.sin(angle);
  const azim = Math.cos(angle);
  sun.position.set(azim * 260, Math.max(12, elev * 260), 120);
  const day = Math.max(0, Math.min(1, elev * 1.6 + 0.25));
  const night = 1 - day;
  sun.intensity = 0.25 + day * 2.2;
  sun.color.setHex(day > 0.6 ? 0xfff2d8 : 0xffb070);
  hemi.intensity = 0.25 + day * 0.65;
  const skyDay = new THREE.Color(0x87bfe8);
  const skyDusk = new THREE.Color(0xe88a5a);
  const skyNight = new THREE.Color(0x0a1428);
  const sky = new THREE.Color();
  if (elev > 0.25) sky.copy(skyDay);
  else if (elev > -0.08) sky.copy(skyDay).lerp(skyDusk, 1 - (elev + 0.08) / 0.33);
  else sky.copy(skyDusk).lerp(skyNight, Math.min(1, (-elev - 0.08) / 0.3));
  scene.background = sky;
  scene.fog.color.copy(sky);
  return night;
}

// Third-person follow camera with mouse orbit and wheel zoom.
export function createCameraRig(camera) {
  const rig = {
    yaw: Math.PI,
    pitch: 0.42,
    dist: 11,
    pos: new THREE.Vector3(0, 30, 60),
  };

  // Follow a target position and heading. dt smooths the motion.
  rig.update = function update(target, heading, dt, input, snap) {
    rig.yaw -= (input ? input.mouseDX : 0) * 0.005;
    rig.pitch += (input ? input.mouseDY : 0) * 0.004;
    rig.pitch = Math.max(0.12, Math.min(1.1, rig.pitch));
    if (input) rig.dist = Math.max(6, Math.min(18, rig.dist + input.wheel * 0.01));
    const cx = target.x - Math.sin(rig.yaw) * Math.cos(rig.pitch) * rig.dist;
    const cz = target.z - Math.cos(rig.yaw) * Math.cos(rig.pitch) * rig.dist;
    const cy = target.y + 2 + Math.sin(rig.pitch) * rig.dist;
    const want = new THREE.Vector3(cx, cy, cz);
    if (snap) {
      rig.pos.copy(want);
    } else {
      const k = 1 - Math.exp(-dt * 7);
      rig.pos.lerp(want, k);
    }
    camera.position.copy(rig.pos);
    camera.lookAt(target.x, target.y + 1.6, target.z);
  };

  // Slow cinematic orbit for the start screen.
  rig.orbit = function orbit(center, radius, angle, height) {
    camera.position.set(
      center.x + Math.sin(angle) * radius,
      height,
      center.z + Math.cos(angle) * radius,
    );
    camera.lookAt(center.x, 6, center.z);
  };

  return rig;
}
