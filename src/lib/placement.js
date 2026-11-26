// Tap a player, then tap a spot. Dragging works too, as an extra.
// Touch rules for small hands:
//  - one finger at a time; other touches are ignored during a move
//  - a touch within 300 ms and 40 px of the last one is ignored
//  - a cancelled or dropped move puts the player back; nobody is ever lost
//  - every move snaps to the nearest spot
// Game feel: a dragged player is lifted a little above the finger so she
// can be seen, the spot she will land on glows, and she lands with a small
// springy bounce. onPick and onDrop let the stage add sounds.

import { distance, nearestSpot } from './geometry.js';

const REPEAT_MS = 300;
const REPEAT_PX = 40;
const DRAG_START_PX = 10;
const PICK_PX = 60; // finger distance that still picks a player: about a 120 px circle
const LIFT_PX = 26; // a dragged player floats this far above a finger, so the finger does not hide her
const SNAP_MS = 280;
const SNAP_EASE = 'cubic-bezier(.3,1.45,.55,1)'; // overshoots a touch, then settles: a little bounce

export function createPlacement({ pitch, players, spots, keeperAt, onChange, onEmptyTap, onPick, onDrop }) {
  // players: [{ el, spotId }]
  const spotById = new Map(spots.map((sp) => [sp.id, sp]));
  let enabled = false;
  let selected = -1;
  let active = null; // { pointerId, index, startX, startY, dragging, from }
  let last = { t: -Infinity, x: 0, y: 0 };
  let frame = 0; // a drag waits for the next screen refresh, so it moves smoothly
  let nearId = null;
  const svg = pitch.svg;
  const anyMarked = players.some((p) => p.keeper);

  function occupant(spotId, except = -1) {
    return players.findIndex((p, i) => i !== except && p.spotId === spotId);
  }

  function refresh() {
    players.forEach((p, i) => {
      const sp = spotById.get(p.spotId);
      p.el.classList.toggle('is-selected', i === selected);
      // A marked keeper always wears the keeper top. Without one, whoever
      // stands in goal wears it.
      const inGoal = !!sp && distance(sp, keeperAt) < 0.5;
      p.el.classList.toggle('is-keeper', anyMarked ? !!p.keeper : inGoal);
    });
    svg.classList.toggle('has-selection', selected >= 0);
    pitch.layers.spots.querySelectorAll('.spot').forEach((dot) => {
      dot.classList.toggle('is-taken', occupant(dot.dataset.spot) >= 0);
    });
  }

  function putAt(index, spotId, animate = true, ms = 220, easing = 'ease-out') {
    const p = players[index];
    p.spotId = spotId;
    const sp = spotById.get(spotId);
    const done = animate ? pitch.moveTo(p.el, sp, ms, easing) : (pitch.place(p.el, sp), Promise.resolve());
    refresh();
    return done;
  }

  // A move the child made: springy snap, then a little squash on landing.
  function settle(index, spotId) {
    const el = players[index].el;
    return putAt(index, spotId, true, SNAP_MS, SNAP_EASE).then(() => {
      el.classList.remove('is-landing');
      void el.getBoundingClientRect();
      el.classList.add('is-landing');
      setTimeout(() => el.classList.remove('is-landing'), 400);
    });
  }

  // Where a dragged player is: a little above the finger (not for a mouse).
  function dragPoint(e) {
    const lift = e.pointerType === 'mouse' ? 0 : LIFT_PX;
    return pitch.eventToYards({ clientX: e.clientX, clientY: e.clientY - lift });
  }

  function showNear(spotId) {
    if (spotId === nearId) return;
    nearId = spotId;
    pitch.layers.spots.querySelectorAll('.spot').forEach((dot) => dot.classList.toggle('is-near', dot.dataset.spot === spotId));
  }

  function stopFrame() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
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
      onPick?.(active.index);
    }
    // Only the newest finger position matters. Draw it on the next screen
    // refresh, so a fast finger does not make the phone redraw many times.
    active.point = { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!active?.dragging || !active.point) return;
      const yards = dragPoint(active.point);
      if (!yards) return;
      pitch.place(players[active.index].el, yards);
      showNear(nearestSpot(yards, spots).id);
    });
  }

  function onUp(e) {
    if (!active || e.pointerId !== active.pointerId) return;
    const a = active;
    active = null;
    stopFrame();
    showNear(null);
    if (a.dragging) {
      const yards = dragPoint(e);
      players[a.index].el.classList.remove('is-dragging');
      if (!yards) return putBack(a);
      const target = nearestSpot(yards, spots);
      const other = occupant(target.id, a.index);
      if (other >= 0) settle(other, a.from); // swap with whoever was there
      settle(a.index, target.id);
      selected = -1;
      refresh();
      onDrop?.(a.index);
      onChange?.();
      return;
    }
    const yards = pitch.eventToYards(e);
    // A tap.
    if (!yards) return;
    if (selected < 0) {
      if (a.index >= 0) {
        selected = a.index;
        refresh();
        onPick?.(a.index);
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
      onPick?.(other);
      return;
    }
    const moving = selected;
    selected = -1;
    settle(moving, target.id);
    onDrop?.(moving);
    onChange?.();
  }

  function putBack(a) {
    stopFrame();
    showNear(null);
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
      // If someone is already there, she swaps to the mover's old spot.
      const other = occupant(spotId, index);
      if (other >= 0) putAt(other, players[index].spotId, true, ms);
      return putAt(index, spotId, true, ms);
    },
    refresh,
    destroy() {
      stopFrame();
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerup', onUp);
      svg.removeEventListener('pointercancel', onCancel);
      svg.removeEventListener('lostpointercapture', onCancel);
    },
  };
}
