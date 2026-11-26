// A burst of confetti for big moments: a good line-up, a goal, a sticker.
// Made from plain coloured squares moved with the Web Animations API. It sits
// on top of everything but never catches a tap, and it tidies itself away.
// When the phone asks for reduced motion, there is no confetti at all.

// Work out where each piece flies. Kept separate from the drawing so it can
// be tested. rand is a function giving numbers from 0 to 1.
export function pieces(count, colours, rand = Math.random) {
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (rand() - 0.5) * Math.PI * 1.1; // mostly upwards
    const speed = 160 + rand() * 260; // CSS pixels
    return {
      colour: colours[i % colours.length],
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      fall: 220 + rand() * 260, // how far it drops after the burst
      spin: (rand() - 0.5) * 1080,
      size: 8 + Math.round(rand() * 8),
      round: rand() < 0.3,
      ms: 1300 + Math.round(rand() * 700),
      delay: Math.round(rand() * 120),
    };
  });
}

const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// from: { x, y } in CSS pixels on screen. Defaults to the middle.
export function burst({ colours, count = 48, from } = {}) {
  if (typeof document === 'undefined' || reduced()) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  const x = from?.x ?? window.innerWidth / 2;
  const y = from?.y ?? window.innerHeight * 0.45;
  const runs = pieces(count, colours).map((p) => {
    const bit = document.createElement('i');
    bit.style.cssText = `left:${x}px;top:${y}px;width:${p.size}px;height:${Math.round(p.size * (p.round ? 1 : 0.6))}px;background:${p.colour};border-radius:${p.round ? '50%' : '2px'}`;
    layer.append(bit);
    if (typeof bit.animate !== 'function') return Promise.resolve();
    const anim = bit.animate(
      [
        { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${p.dx}px), calc(-50% + ${p.dy}px)) rotate(${p.spin / 2}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(calc(-50% + ${p.dx * 1.2}px), calc(-50% + ${p.dy + p.fall}px)) rotate(${p.spin}deg)`, opacity: 0 },
      ],
      { duration: p.ms, delay: p.delay, easing: 'cubic-bezier(.15,.7,.4,1)', fill: 'both' }
    );
    return anim.finished.catch(() => {});
  });
  Promise.all(runs).then(() => layer.remove());
  // Belt and braces: never leave confetti behind, even if an animation stalls.
  setTimeout(() => layer.remove(), 3000);
}

// Confetti bursting from the middle of an element on screen.
export function burstFrom(el, opts = {}) {
  if (!el?.getBoundingClientRect) return burst(opts);
  const r = el.getBoundingClientRect();
  burst({ ...opts, from: { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
}
