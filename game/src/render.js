// Rendering for Solmar Bay: the WebGL renderer and the third-person follow
// camera. The camera trails the player or their vehicle, eases toward the
// heading, and lets the mouse drag orbit it.

const THREE = window.THREE;

export function createRenderer(G) {
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  G.renderer = renderer;
  G.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  window.addEventListener('resize', () => {
    G.camera.aspect = window.innerWidth / window.innerHeight;
    G.camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

export function updateCamera(G, dt) {
  if (G.cameraOverride) {
    if (G.cameraOverride.follow) {
      // A staged shot: the camera tracks the player from a fixed side
      // offset, so the action never drives out of frame.
      const target = G.player.vehicle ? G.player.vehicle.pos : G.player.pos;
      const o = G.cameraOverride;
      G.camera.position.set(target.x + o.dx, target.y + o.height, target.z + o.dz);
      G.camera.lookAt(target.x + o.lookX, target.y + 1.5, target.z + o.lookZ);
      return;
    }
    G.camera.position.copy(G.cameraOverride.pos);
    G.camera.lookAt(G.cameraOverride.look);
    return;
  }
  const input = G.input;
  G.orbitX = (G.orbitX || 0) + (input.lookDX || 0) * 0.004;
  G.orbitY = Math.max(-0.1, Math.min(0.7, (G.orbitY || 0.25) + (input.lookDY || 0) * 0.003));
  const target = G.player.vehicle ? G.player.vehicle.pos : G.player.pos;
  const heading = G.player.vehicle ? G.player.vehicle.angle : G.player.angle;
  // The camera eases toward the heading so turns feel smooth, not snappy.
  let targetYaw = heading + G.orbitX;
  let diff = targetYaw - G.cameraYaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  G.cameraYaw += diff * Math.min(1, dt * (G.player.vehicle ? 3.5 : 6));
  const dist = G.player.vehicle ? 10.5 : 7.5;
  const height = G.player.vehicle ? 4.2 : 3.4;
  const fx = -Math.sin(G.cameraYaw);
  const fz = -Math.cos(G.cameraYaw);
  const camPos = {
    x: target.x - fx * dist,
    y: target.y + height + Math.sin(G.orbitY) * 4,
    z: target.z - fz * dist,
  };
  G.camera.position.set(camPos.x, camPos.y, camPos.z);
  G.camera.lookAt(target.x + fx * 5, target.y + 1.6, target.z + fz * 5);
}
