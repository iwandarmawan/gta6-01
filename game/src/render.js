// Solmar Bay — three.js renderer: scene, sun, sky, fog and the cameras.
// Two cameras in one: a low chase cam behind the car, and a closer
// third-person cam on foot. Both smooth-follow the player and shake on
// hard hits, so crashes feel like crashes.

import { COLORS, WORLD } from './config.js';

const T = window.THREE;

export class Renderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;

    this.scene = new T.Scene();
    this.scene.background = new T.Color(COLORS.sky);
    this.scene.fog = new T.Fog(COLORS.fog, 120, 620);

    // Sun: a warm directional light with shadows over the whole city.
    const sun = new T.DirectionalLight(COLORS.sun, 1.35);
    sun.position.set(180, 260, 120);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -320;
    sun.shadow.camera.right = 320;
    sun.shadow.camera.top = 320;
    sun.shadow.camera.bottom = -320;
    sun.shadow.camera.far = 800;
    this.scene.add(sun);
    // Hemisphere fill so the shadowed sides are never pitch black.
    this.scene.add(new T.HemisphereLight(0xbfd8ff, 0x8a7a5a, 0.75));

    this.camera = new T.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
    this.camera.position.set(0, 30, 80);

    this.shakeAmount = 0;
    this.camPos = new T.Vector3(0, 30, 80);
    this.camLook = new T.Vector3(0, 0, 0);

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  shake(amount) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  // Follow the player: behind the car when driving, over the shoulder on
  // foot. The camera lerps, so turns feel smooth instead of snappy.
  follow(dt, player) {
    const heading = player.heading;
    const hx = Math.sin(heading);
    const hz = Math.cos(heading);
    let dist = 8.5;
    let height = 3.4;
    let lookAhead = 7;
    let lookHeight = 1.6;
    if (player.inCar && player.car) {
      const speed = Math.abs(player.car.speed);
      dist = 9.5 + speed * 0.22;
      height = 4.2 + speed * 0.05;
      lookAhead = 10;
    }
    const tx = player.x - hx * dist;
    const tz = player.z - hz * dist;
    const k = 1 - Math.pow(0.0001, dt); // frame-rate independent smoothing
    this.camPos.x += (tx - this.camPos.x) * k;
    this.camPos.y += (height - this.camPos.y) * k;
    this.camPos.z += (tz - this.camPos.z) * k;
    // Keep the camera out of buildings: lift it when it would clip a roof.
    if (this.camPos.y < 2.2) this.camPos.y = 2.2;
    const lx = player.x + hx * lookAhead;
    const lz = player.z + hz * lookAhead;
    this.camLook.x += (lx - this.camLook.x) * k;
    this.camLook.y += (lookHeight - this.camLook.y) * k;
    this.camLook.z += (lz - this.camLook.z) * k;

    let sx = 0;
    let sy = 0;
    if (this.shakeAmount > 0.01) {
      sx = (Math.random() - 0.5) * this.shakeAmount;
      sy = (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount *= Math.pow(0.02, dt);
    }
    this.camera.position.set(this.camPos.x + sx, this.camPos.y + sy, this.camPos.z);
    this.camera.lookAt(this.camLook.x, this.camLook.y, this.camLook.z);
  }

  // Snap the camera behind the player instantly (spawn, respawn, shots).
  // Any leftover shake dies here: a fresh view never starts mid-tremor.
  snap(player) {
    this.shakeAmount = 0;
    const hx = Math.sin(player.heading);
    const hz = Math.cos(player.heading);
    const dist = player.inCar ? 10 : 8.5;
    this.camPos.set(player.x - hx * dist, player.inCar ? 4.2 : 3.4, player.z - hz * dist);
    this.camLook.set(player.x + hx * 8, 1.6, player.z + hz * 8);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
