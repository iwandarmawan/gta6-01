// Missions and fares: the six-mission story arc for Rico Marlowe and Vera
// Costa, then repeatable taxi fares once the story is done. A beacon pillar
// marks the current objective; a timer runs on the timed jobs.
const THREE = window.THREE;

import { MISSIONS, FARES, POIS } from './config.js';

export class Missions {
  constructor(G) {
    this.G = G;
    this.index = 0;
    this.stage = 0;
    this.timeLeft = 0;
    this.active = true;
    this.fareMode = false;
    this.fareIndex = 0;
    this.fareStage = 0;

    this.beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 60, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.beacon.position.y = 30;
    G.scene.add(this.beacon);

    // The ramp for Rooftop Leap, at the airfield.
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(7, 0.6, 12), new THREE.MeshLambertMaterial({ color: 0xc2a23a }));
    ramp.position.set(150, 1.6, -70);
    ramp.rotation.x = -0.32;
    G.scene.add(ramp);

    // The five cache packages at the lighthouse point.
    this.packages = [];
    for (let i = 0; i < 5; i++) {
      const pkg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0xffd24a }));
      const a = (i / 5) * Math.PI * 2;
      pkg.position.set(POIS.lighthouse.x + Math.cos(a) * 6, 0.8, POIS.lighthouse.z + Math.sin(a) * 6);
      G.scene.add(pkg);
      this.packages.push(pkg);
    }

    this.setTimer();
    G.toast(MISSIONS[0].intro);
  }

  current() {
    return MISSIONS[this.index];
  }

  stageDef() {
    if (this.fareMode) {
      const f = FARES[this.fareIndex % FARES.length];
      if (this.fareStage === 0) {
        return { text: `Pick up the fare at ${POIS[f.from].label}`, x: POIS[f.from].x, z: POIS[f.from].z, r: 8, need: 'reach' };
      }
      return { text: `Drop the fare at ${POIS[f.to].label}`, x: POIS[f.to].x, z: POIS[f.to].z, r: 10, need: 'reach' };
    }
    return this.current().stages[this.stage];
  }

  setTimer() {
    this.timeLeft = this.fareMode ? 90 : this.current().time || 0;
  }

  objectiveText() {
    if (!this.active) return 'Story complete — press M for a fare, G for the garage.';
    return this.stageDef().text;
  }

  update(dt) {
    if (!this.active) return;
    const st = this.stageDef();
    this.beacon.position.set(st.x, 30, st.z);
    if (this.timeLeft > 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.failStage();
        return;
      }
    }
    const p = this.G.player;
    const d = Math.hypot(p.pos.x - st.x, p.pos.z - st.z);
    let done = false;
    if (st.need === 'reach') done = d <= st.r;
    else if (st.need === 'enterCar') done = !p.onFoot && p.vehicleKind !== 'skiff' && d <= st.r;
    else if (st.need === 'boardBoat') done = !p.onFoot && p.vehicleKind === 'skiff' && d <= st.r;
    else if (st.need === 'speed') done = !p.onFoot && p.speed >= st.speed && d <= st.r;
    if (done) this.completeStage();
  }

  completeStage() {
    const G = this.G;
    if (this.fareMode) {
      if (this.fareStage === 0) {
        this.fareStage = 1;
        this.timeLeft = 90;
        return;
      }
      const f = FARES[this.fareIndex % FARES.length];
      G.player.cash += f.reward;
      G.toast(`Fare complete +$${f.reward}`);
      G.audio.chime();
      this.fareIndex++;
      this.fareStage = 0;
      this.timeLeft = 90;
      return;
    }
    this.stage++;
    const m = this.current();
    if (this.stage >= m.stages.length) {
      G.player.cash += m.reward;
      G.toast(`${m.name} complete +$${m.reward}`);
      G.audio.chime();
      this.index++;
      this.stage = 0;
      if (this.index >= MISSIONS.length) {
        this.active = false;
        this.beacon.visible = false;
        G.toast('Story complete — Rico and Vera own the night. Fares still pay.');
        return;
      }
      G.toast(MISSIONS[this.index].intro);
      this.setTimer();
    }
  }

  failStage() {
    const G = this.G;
    G.toast('Too slow — the fare walked away');
    if (this.fareMode) {
      this.fareIndex++;
      this.fareStage = 0;
      this.timeLeft = 90;
      return;
    }
    this.stage = 0;
    this.setTimer();
  }

  startFare() {
    if (this.fareMode || this.active) return;
    this.fareMode = true;
    this.fareStage = 0;
    this.timeLeft = 90;
    this.G.toast('Fare accepted — pick them up');
  }
}
