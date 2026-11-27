// "Tap here!" pointers for the first time she meets each kind of button
// (Rich's daughter didn't know what to press first, 26th and 27th November
// 2026). Once she has tapped that kind of button, its pointer never comes
// back. What she has tapped is kept with the rest of her saved data, so
// "Delete everything" brings the pointers back too.

import * as store from './storage.js';
import { tapHere } from './icons.js';

const KEY = 'pointed';

export function hasPointed(key) {
  return !!store.load(KEY, {})[key];
}

// btn: the button. key: which kind of button it is ('play', 'story' ...).
// above: put the pointer above the button instead of beside it, for wide
// buttons or ones near the right-hand edge.
export function pointOnce(btn, key, { above = false } = {}) {
  if (!btn || hasPointed(key) || btn.querySelector('.tap-here')) return;
  const pointer = tapHere();
  if (above) pointer.classList.add('is-above');
  btn.classList.add('has-pointer');
  btn.append(pointer);
  btn.addEventListener(
    'click',
    () => {
      if (btn.disabled) return;
      store.save(KEY, { ...store.load(KEY, {}), [key]: true });
      pointer.remove();
      btn.classList.remove('has-pointer');
    },
    { once: true }
  );
}
