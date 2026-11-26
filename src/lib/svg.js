// Small helpers for building SVG and HTML in code.

export const SVG_NS = 'http://www.w3.org/2000/svg';

export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  setAttrs(el, attrs);
  children.flat().forEach((c) => c != null && el.append(c));
  return el;
}

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  children.flat().forEach((c) => c != null && c !== false && el.append(c));
  return el;
}

function setAttrs(el, attrs) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v);
  }
}

// Durations shrink to almost nothing when the phone asks for reduced motion.
export function motion(ms) {
  const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return reduce ? Math.min(ms, 1) : ms;
}

export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
