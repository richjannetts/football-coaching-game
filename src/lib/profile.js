// The player setup steps, in order. Returns the first one not done yet,
// or null when the player is ready.
export const SETUP_STEPS = ['name', 'skin', 'hairColour', 'hair'];

export function missingStep(state) {
  return SETUP_STEPS.find((key) => !(typeof state[key] === 'string' && state[key].trim())) || null;
}
