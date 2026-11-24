// render.js — renderer, dawn sky, lights.
import THREE from 'three';
import { DAWN } from './config.js';

export function makeSkyTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#7fa8d8');
  grad.addColorStop(0.45, '#f7c98d');
  grad.addColorStop(0.62, '#ffd9a8');
  grad.addColorStop(1, '#ffeecf');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = makeSkyTexture();
  scene.fog = new THREE.Fog(DAWN.fog, DAWN.fogNear, DAWN.fogFar);
  const ambient = new THREE.AmbientLight(DAWN.ambient, DAWN.ambientIntensity);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(DAWN.hemiSky, DAWN.hemiGround, DAWN.hemiIntensity);
  scene.add(hemi);
  // Low eastern sun: long dawn shadows pointing west.
  const sun = new THREE.DirectionalLight(DAWN.sunLight, DAWN.sunIntensity);
  sun.position.set(300, 55, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -220; sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220; sun.shadow.camera.bottom = -220;
  sun.shadow.camera.far = 800;
  scene.add(sun);
  return { scene, sun };
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 30, 60);
  return camera;
}
