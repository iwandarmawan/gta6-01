// Rendering: the WebGL renderer, sun-soaked lighting, sky and fog, and the
// third-person chase camera that follows the player on foot and in a vehicle.
export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  document.getElementById('game').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd4ef);
  scene.fog = new THREE.Fog(0x9fd4ef, 180, 520);
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);

  // A high summer sun and a soft sky fill: the city reads sun-soaked, not flat.
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x8a9a6a, 1.1));

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  return { renderer, scene, camera };
}

// Chase camera: behind and above the player, eased toward its target so turns
// feel smooth instead of snappy. In shot mode the camera is fixed by shots.js.
export function updateCamera(G, dt) {
  if (G.shotCam) return;
  const P = G.player;
  const heading = P.vehicle ? P.vehicle.heading : P.heading;
  const dist = P.vehicle ? 11 : 7.5;
  const height = P.vehicle ? 4.2 : 3.4;
  const tx = P.x - Math.sin(heading) * dist;
  const tz = P.z - Math.cos(heading) * dist;
  const k = 1 - Math.pow(0.001, dt);
  G.camera.position.x += (tx - G.camera.position.x) * k;
  G.camera.position.y += (height - G.camera.position.y) * k;
  G.camera.position.z += (tz - G.camera.position.z) * k;
  G.camera.lookAt(P.x + Math.sin(heading) * 4, 1.6, P.z + Math.cos(heading) * 4);
}
