// The only place the game touches saved data. Everything is kept in
// localStorage on this device, under one prefix, so "Delete everything"
// can remove it all and a later move to IndexedDB only changes this file.

const PREFIX = 'fcg.';

function area() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null; // Some private modes throw when storage is touched.
  }
}

export function load(key, fallback = null) {
  try {
    const raw = area()?.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    area()?.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function deleteEverything() {
  const store = area();
  if (!store) return;
  const keys = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => store.removeItem(k));
}

// Ask the browser to keep our data. Installed iPhone web apps are already
// exempt from Safari's 7-day clean-up, so this is a belt-and-braces extra.
export function askToKeepData() {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* not supported: nothing to do */
  }
}
