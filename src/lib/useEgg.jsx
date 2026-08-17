// Compatibility shim: legacy Easter-egg behavior has been disabled.
// Kept temporarily for older page imports so production pages remain unchanged.
export function useEgg() {
  return { onClick: undefined, eggMsg: null }
}

export function EggToast() {
  return null
}
