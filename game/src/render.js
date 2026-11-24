// The renderer: a three.js scene, a sun that throws shadows, a sky-blue
// background and a chase camera that follows the player — or, in shot mode,
// a fixed camera pose the shot chose. Nothing here knows about missions or
// money; it only draws what the game tells it to.
const THREE = window.THREE;

export function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd4ff);
  scene.fog = new THREE.Fog(0x9fd4ff, 220, 620);
  const sun = new THREE.DirectionalLight(0xfff2d9, 1.15);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 600;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x6fae4e, 0.75));
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return { renderer, scene, camera, sun };
}

// A chase camera: behind and above the player, looking a little ahead,
// smoothed so it never snaps. In shot mode the caller passes a fixed pose
// and the camera goes exactly there instead.
export function updateCamera(camera, player, dt, shotPose) {
  if (shotPose) {
    camera.position.set(shotPose.x, shotPose.y, shotPose.z);
    camera.lookAt(shotPose.tx, shotPose.ty, shotPose.tz);
    return;
  }
  const back = 9 + player.speed * 0.25;
  const height = 5 + player.speed * 0.06;
  const fx = -Math.sin(player.heading), fz = -Math.cos(player.heading);
  const tx = player.x - fx * back, tz = player.z - fz * back;
  const k = 1 - Math.exp(-6 * dt);
  camera.position.x += (tx - camera.position.x) * k;
  camera.position.y += (height - camera.position.y) * k;
  camera.position.z += (tz - camera.position.z) * k;
  camera.lookAt(player.x + fx * 6, 1.5, player.z + fz * 6);
}
