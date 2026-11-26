// Tap a player, then tap a spot. Dragging works too, as an extra.
// Touch rules for small hands:
//  - one finger at a time; other touches are ignored during a move
//  - a touch within 300 ms and 40 px of the last one is ignored
//  - a cancelled or dropped move puts the player back; nobody is ever lost
//  - every move snaps to the nearest spot

import { distance, nearestSpot } from './geometry.js';

const REPEAT_MS = 300;
const REPEAT_PX = 40;
const DRAG_START_PX = 10;
const PICK_PX = 60; // finger distance that still picks a player: about a 120 px circle

export function createPlacement({ pitch, players, spots, keeperAt, onChange, onEmptyTap }) {
  // players: [{ el, spotId }]
  const spotById = new Map(spots.map((sp) => [sp.id, sp]));
  let enabled = false;
  let selected = -1;
  let active = null; // { pointerId, index, startX, startY, dragging, from }
  let last = { t: -Infinity, x: 0, y: 0 };
  const svg = pitch.svg;

  function occupant(spotId, except = -1) {
    return players.findIndex((p, i) => i !== except && p.spotId === spotId);
  }

  function refresh() {
    players.forEach((p, i) => {
      const sp = spotById.get(p.spotId);
      p.el.classList.toggle('is-selected', i === selected);
      p.el.classList.toggle('is-keeper', !!sp && distance(sp, keeperAt) < 0.5);
    });
    svg.classList.toggle('has-selection', selected >= 0);
    pitch.layers.spots.querySelectorAll('.spot').forEach((dot) => {
      dot.classList.toggle('is-taken', occupant(dot.dataset.spot) >= 0);
    });
  }

  function putAt(index, spotId, animate = true, ms = 220) {
    const p = players[index];
    p.spotId = spotId;
    const sp = spotById.get(spotId);
    const done = animate ? pitch.moveTo(p.el, sp, ms, 'ease-out') : (pitch.place(p.el, sp), Promise.resolve());
    refresh();
    return done;
  }

  function pickPlayer(yards, px) {
    let best = -1;
    let bestD = Infinity;
    players.forEach((p, i) => {
      const d = distance(p.el._pos, yards);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return bestD * px <= PICK_PX ? best : -1;
  }

  function isRepeat(e) {
    const now = e.timeStamp || performance.now();
    return now - last.t < REPEAT_MS && Math.hypot(e.clientX - last.x, e.clientY - last.y) < REPEAT_PX;
  }

  function onDown(e) {
    if (!enabled) return;
    if (!e.isPrimary || active) return; // one finger only
    if (e.button !== undefined && e.button > 0) return;
    if (isRepeat(e)) return;
    last = { t: e.timeStamp || performance.now(), x: e.clientX, y: e.clientY };
    const yards = pitch.eventToYards(e);
    if (!yards) return;
    const px = pitch.pxPerYard();
    const hit = pickPlayer(yards, px);
    active = { pointerId: e.pointerId, index: hit, startX: e.clientX, startY: e.clientY, dragging: false, from: hit >= 0 ? players[hit].spotId : null };
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    e.preventDefault();
  }

  function onMove(e) {
    if (!active || e.pointerId !== active.pointerId) return;
    if (active.index < 0) return;
    if (!active.dragging) {
      if (Math.hypot(e.clientX - active.startX, e.clientY - active.startY) < DRAG_START_PX) return;
      // Dragging is only for a player who is already picked, or the one under the finger.
      active.dragging = true;
      selected = active.index;
      players[active.index].el.classList.add('is-dragging');
      refresh();
    }
    const yards = pitch.eventToYards(e);
    if (yards) pitch.place(players[active.index].el, yards);
  }

  function onUp(e) {
    if (!active || e.pointerId !== active.pointerId) return;
    const a = active;
    active = null;
    const yards = pitch.eventToYards(e);
    if (a.dragging) {
      players[a.index].el.classList.remove('is-dragging');
      if (!yards) return putBack(a);
      const target = nearestSpot(yards, spots);
      const other = occupant(target.id, a.index);
      if (other >= 0) putAt(other, a.from); // swap with whoever was there
      putAt(a.index, target.id);
      selected = -1;
      refresh();
      onChange?.();
      return;
    }
    // A tap.
    if (!yards) return;
    if (selected < 0) {
      if (a.index >= 0) {
        selected = a.index;
        refresh();
      } else {
        onEmptyTap?.();
      }
      return;
    }
    const target = nearestSpot(yards, spots);
    const other = occupant(target.id, selected);
    if (selected === a.index && players[selected].spotId === target.id) {
      selected = -1; // tapped the picked player again: let go
      refresh();
      return;
    }
    if (other >= 0) {
      selected = other; // that spot is taken: pick that player instead
      refresh();
      return;
    }
    const moving = selected;
    selected = -1;
    putAt(moving, target.id);
    onChange?.();
  }

  function putBack(a) {
    if (a.index >= 0) {
      players[a.index].el.classList.remove('is-dragging');
      putAt(a.index, a.from);
    }
    refresh();
  }

  function onCancel(e) {
    if (!active || e.pointerId !== active.pointerId) return;
    const a = active;
    active = null;
    if (a.dragging) {
      selected = -1;
      putBack(a);
    }
  }

  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onCancel);
  svg.addEventListener('lostpointercapture', onCancel);

  players.forEach((p, i) => putAt(i, p.spotId, false));

  return {
    enable() {
      enabled = true;
      svg.classList.add('is-placing');
    },
    disable() {
      enabled = false;
      if (active) onCancel({ pointerId: active.pointerId });
      active = null;
      selected = -1;
      svg.classList.remove('is-placing');
      refresh();
    },
    positions() {
      return players.map((p) => spotById.get(p.spotId));
    },
    onBench() {
      return players.map((p, i) => (spotById.get(p.spotId).bench ? i : -1)).filter((i) => i >= 0);
    },
    moveTo(index, spotId, ms = 900) {
      return putAt(index, spotId, true, ms);
    },
    refresh,
    destroy() {
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerup', onUp);
      svg.removeEventListener('pointercancel', onCancel);
      svg.removeEventListener('lostpointercapture', onCancel);
    },
  };
}
