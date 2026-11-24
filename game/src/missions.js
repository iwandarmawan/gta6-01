// missions.js — the 6-mission story for Rico Marlowe / Vera Costa, plus
// repeatable taxi fares after the story. updateMissions is never called in
// frozen shot mode (shots.js sets phase 'done' so staging is never overwritten).
import { MISSION_DEFS, FARES } from './config.js';

export function createMissions() {
  return {
    index: 0, phase: 'active', timer: 0, dropsLeft: 0, fareIndex: 0,
    objective: MISSION_DEFS[0].objective,
    current: MISSION_DEFS[0],
    storyDone: false,
  };
}

export function missionTargetPos(m, spots) {
  if (m.storyDone) return spots.plaza;
  const t = m.current.target;
  if (t === 'car') return null; // any car: objective completes on entering one
  if (t === 'marina') return spots.marina;
  if (t === 'plaza') return spots.plaza;
  if (t === 'drops') return spots.garage; // courier drops run through the garage district
  if (t === 'airfield') return spots.airfield;
  if (t === 'lighthouse') return spots.lighthouse;
  return spots.plaza;
}

function advance(m, spots) {
  if (m.storyDone) {
    m.fareIndex = (m.fareIndex + 1) % FARES.length;
    m.objective = 'Taxi fare — drop the passenger at Palm Plaza ($' + FARES[m.fareIndex] + ')';
    return;
  }
  m.index += 1;
  if (m.index >= MISSION_DEFS.length) {
    m.storyDone = true;
    m.fareIndex = 0;
    m.objective = 'Taxi fare — drop the passenger at Palm Plaza ($' + FARES[0] + ')';
    m.current = null;
    return;
  }
  m.current = MISSION_DEFS[m.index];
  m.objective = m.current.objective;
  m.timer = m.current.timer || 0;
  m.dropsLeft = m.current.target === 'drops' ? 3 : 0;
}

export function updateMissions(m, playerPos, dt, spots, events) {
  if (m.phase !== 'active' || dt <= 0) return;
  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) { // out of time: retry the same mission
      m.timer = m.current.timer || 0;
      events.toast('Too slow — try again, Rico.');
      return;
    }
  }
  const target = missionTargetPos(m, spots);
  if (!target) return; // 'car' mission completes on entering a vehicle
  const d = Math.hypot(playerPos.x - target.x, playerPos.z - target.z);
  const reach = m.current && m.current.target === 'lighthouse' ? 10 : 8;
  if (d < reach) {
    if (m.current && m.current.target === 'drops') {
      m.dropsLeft -= 1;
      if (m.dropsLeft > 0) {
        m.objective = 'Deliver ' + m.dropsLeft + ' more drop' + (m.dropsLeft > 1 ? 's' : '') + ' — 120s';
        events.toast('Drop delivered. ' + m.dropsLeft + ' to go.');
        return;
      }
    }
    const pay = m.storyDone ? FARES[m.fareIndex] : (m.current ? m.current.pay : 0);
    events.cash(pay);
    events.toast((m.storyDone ? 'Fare complete' : m.current.name + ' complete') + ' — +$' + pay);
    advance(m, spots);
  }
}

export function completeCarMission(m, events) {
  if (m.phase !== 'active' || m.storyDone) return;
  if (m.current && m.current.target === 'car') {
    events.cash(m.current.pay);
    events.toast(m.current.name + ' complete — +$' + m.current.pay);
    advance(m, null);
  }
}
