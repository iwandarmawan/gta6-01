// render.js — renderer, storm lighting, fog, camera.
import THREE from './three-shim.js';
import { STORM } from './config.js';

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('game').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(STORM.sky);
  scene.fog = new THREE.Fog(STORM.fog, STORM.fogNear, STORM.fogFar);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 30, 60);

  const ambient = new THREE.AmbientLight(STORM.ambient, STORM.ambientI);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(STORM.hemiSky, STORM.hemiGround, STORM.hemiI);
  scene.add(hemi);
  const dirLight = new THREE.DirectionalLight(STORM.sun, STORM.sunI);
  dirLight.position.set(-80, 120, 40);
  scene.add(dirLight);

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);
  return { renderer, scene, camera, dirLight, resize };
}
